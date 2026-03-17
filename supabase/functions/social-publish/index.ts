import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function publishToFacebook(pageToken: string, pageId: string, post: any): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const body: any = { message: post.caption, access_token: pageToken };

    // If scheduling for future
    if (post.scheduled_at) {
      const scheduledTime = Math.floor(new Date(post.scheduled_at).getTime() / 1000);
      const now = Math.floor(Date.now() / 1000);
      const tenMin = 600;
      const thirtyDays = 30 * 24 * 3600;

      if (scheduledTime - now >= tenMin && scheduledTime - now <= thirtyDays) {
        body.scheduled_publish_time = scheduledTime;
        body.published = false;
      }
    }

    let endpoint: string;

    if (post.media_urls && post.media_urls.length > 0) {
      if (post.media_urls.length === 1) {
        // Single photo
        endpoint = `https://graph.facebook.com/v21.0/${pageId}/photos`;
        body.url = post.media_urls[0];
      } else {
        // Multiple photos - create each, then multi-photo post
        const photoIds: string[] = [];
        for (const url of post.media_urls) {
          const photoRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url, published: false, access_token: pageToken }),
          });
          const photoData = await photoRes.json();
          if (photoData.id) photoIds.push(photoData.id);
        }

        endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`;
        delete body.url;
        photoIds.forEach((id, i) => {
          body[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
        });
      }
    } else {
      endpoint = `https://graph.facebook.com/v21.0/${pageId}/feed`;
    }

    const params = new URLSearchParams();
    Object.entries(body).forEach(([k, v]) => params.append(k, String(v)));

    const res = await fetch(endpoint, { method: "POST", body: params });
    const data = await res.json();

    if (data.error) {
      return { success: false, error: data.error.message };
    }

    return { success: true, postId: data.id || data.post_id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function publishToInstagram(pageToken: string, igAccountId: string, post: any): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    let containerId: string;

    if (post.media_type === "carousel" && post.media_urls && post.media_urls.length > 1) {
      // Create carousel items
      const itemIds: string[] = [];
      for (const url of post.media_urls) {
        const itemRes = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: url,
            is_carousel_item: true,
            access_token: pageToken,
          }),
        });
        const itemData = await itemRes.json();
        if (itemData.id) itemIds.push(itemData.id);
        else if (itemData.error) return { success: false, error: itemData.error.message };
      }

      // Create carousel container
      const carouselRes = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "CAROUSEL",
          children: itemIds.join(","),
          caption: post.caption,
          access_token: pageToken,
        }),
      });
      const carouselData = await carouselRes.json();
      if (carouselData.error) return { success: false, error: carouselData.error.message };
      containerId = carouselData.id;
    } else if (post.media_type === "video" || post.media_type === "reel") {
      // Video/Reel
      const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: post.media_type === "reel" ? "REELS" : "VIDEO",
          video_url: post.media_urls?.[0],
          caption: post.caption,
          access_token: pageToken,
        }),
      });
      const mediaData = await mediaRes.json();
      if (mediaData.error) return { success: false, error: mediaData.error.message };
      containerId = mediaData.id;

      // Wait for video processing
      let status = "IN_PROGRESS";
      let attempts = 0;
      while (status === "IN_PROGRESS" && attempts < 30) {
        await new Promise(r => setTimeout(r, 5000));
        const statusRes = await fetch(`https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${pageToken}`);
        const statusData = await statusRes.json();
        status = statusData.status_code || "FINISHED";
        attempts++;
      }
    } else {
      // Single image
      const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: post.media_urls?.[0],
          caption: post.caption,
          access_token: pageToken,
        }),
      });
      const mediaData = await mediaRes.json();
      if (mediaData.error) return { success: false, error: mediaData.error.message };
      containerId = mediaData.id;
    }

    // Publish the container
    const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId, access_token: pageToken }),
    });
    const publishData = await publishRes.json();

    if (publishData.error) {
      return { success: false, error: publishData.error.message };
    }

    return { success: true, postId: publishData.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { action, post_id } = await req.json();

    if (action === "publish" || action === "publish_now") {
      const { data: post } = await supabase
        .from("social_posts")
        .select("*, meta_pages(*)")
        .eq("id", post_id)
        .single();

      if (!post) {
        return new Response(JSON.stringify({ error: "Post not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!post.meta_pages) {
        return new Response(JSON.stringify({ error: "No page selected" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update status to publishing
      await supabase.from("social_posts").update({ status: "publishing" }).eq("id", post_id);

      let result;
      const page = post.meta_pages;

      if (post.platform === "instagram" && page.instagram_account_id) {
        result = await publishToInstagram(page.page_access_token, page.instagram_account_id, post);
      } else {
        // For publish_now, remove scheduled_at
        const publishPost = action === "publish_now" ? { ...post, scheduled_at: null } : post;
        result = await publishToFacebook(page.page_access_token, page.page_id, publishPost);
      }

      // Log the result
      await supabase.from("social_logs").insert({
        social_post_id: post_id,
        action: action,
        success: result.success,
        response_payload: result,
        error_message: result.error || null,
      });

      if (result.success) {
        const newStatus = (action === "publish_now" || post.platform === "instagram") ? "published" : "scheduled";
        await supabase.from("social_posts").update({
          status: newStatus,
          meta_post_id: result.postId,
          published_at: newStatus === "published" ? new Date().toISOString() : null,
          error_message: null,
        }).eq("id", post_id);

        await supabase.from("social_post_history").insert({
          social_post_id: post_id,
          old_status: post.status,
          new_status: newStatus,
          change_note: `Published via ${post.platform}`,
        });
      } else {
        await supabase.from("social_posts").update({
          status: "error",
          error_message: result.error,
          retry_count: (post.retry_count || 0) + 1,
        }).eq("id", post_id);

        await supabase.from("social_post_history").insert({
          social_post_id: post_id,
          old_status: post.status,
          new_status: "error",
          change_note: `Error: ${result.error}`,
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel a scheduled Facebook post
    if (action === "cancel") {
      const { data: post } = await supabase
        .from("social_posts")
        .select("*")
        .eq("id", post_id)
        .single();

      if (post?.meta_post_id && post.platform === "facebook") {
        const { data: page } = await supabase
          .from("meta_pages")
          .select("page_access_token")
          .eq("id", post.meta_page_id)
          .single();

        if (page) {
          await fetch(`https://graph.facebook.com/v21.0/${post.meta_post_id}?access_token=${page.page_access_token}`, {
            method: "DELETE",
          });
        }
      }

      await supabase.from("social_posts").update({ status: "cancelled" }).eq("id", post_id);

      await supabase.from("social_post_history").insert({
        social_post_id: post_id,
        old_status: post?.status,
        new_status: "cancelled",
        change_note: "Post cancelled",
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("social-publish error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
