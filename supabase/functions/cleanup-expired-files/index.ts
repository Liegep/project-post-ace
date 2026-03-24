import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find posts published > 30 days ago that DON'T have retain_files enabled
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, media_urls, image_url")
      .eq("retain_files", false)
      .not("published_at", "is", null)
      .lte("published_at", thirtyDaysAgo.toISOString());

    if (error) throw error;
    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No files to clean up", cleaned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let cleaned = 0;

    for (const post of posts) {
      const urls: string[] = post.media_urls || [];
      if (post.image_url && !urls.includes(post.image_url)) {
        urls.push(post.image_url);
      }

      // Only delete files that are in our storage (not external links)
      const storagePaths: string[] = [];
      for (const url of urls) {
        // Only process URLs from our Supabase storage
        if (url.includes("/storage/v1/object/public/media/")) {
          const path = url.split("/storage/v1/object/public/media/")[1];
          if (path) storagePaths.push(decodeURIComponent(path));
        }
      }

      if (storagePaths.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from("media")
          .remove(storagePaths);

        if (deleteError) {
          console.error(`Error deleting files for post ${post.id}:`, deleteError);
          continue;
        }
      }

      // Clear media URLs but keep all other data (text, captions, status, etc.)
      await supabase
        .from("posts")
        .update({
          media_urls: [],
          image_url: "",
        })
        .eq("id", post.id);

      cleaned++;
      console.log(`Cleaned files for post ${post.id} (${storagePaths.length} files)`);
    }

    return new Response(
      JSON.stringify({ message: "File retention cleanup complete", cleaned }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
