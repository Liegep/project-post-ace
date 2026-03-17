import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const now = new Date().toISOString();

    // Find Instagram posts that are approved/scheduled and due
    // (Facebook scheduling is handled natively by Meta, Instagram needs our cron)
    const { data: duePosts } = await supabase
      .from("social_posts")
      .select("id, platform, status")
      .eq("platform", "instagram")
      .in("status", ["approved", "scheduled"])
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(10);

    if (!duePosts || duePosts.length === 0) {
      return new Response(JSON.stringify({ message: "No posts due", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const post of duePosts) {
      // Call the social-publish function internally
      const publishRes = await fetch(`${supabaseUrl}/functions/v1/social-publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ action: "publish_now", post_id: post.id }),
      });

      const result = await publishRes.json();
      results.push({ post_id: post.id, ...result });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("social-scheduler error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
