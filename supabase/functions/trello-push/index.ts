import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TRELLO_API = "https://api.trello.com/1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TRELLO_API_KEY = Deno.env.get("TRELLO_API_KEY");
    const TRELLO_TOKEN = Deno.env.get("TRELLO_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TRELLO_API_KEY || !TRELLO_TOKEN) throw new Error("Trello credentials not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase credentials not configured");

    const { postId, action } = await req.json();
    // action: "update" | "move_column" | "update_description"
    if (!postId) throw new Error("postId is required");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authParams = `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;

    // Get the post with its trello_card_id
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (postError || !post) throw new Error("Post not found");
    if (!post.trello_card_id) {
      // Post wasn't imported from Trello, nothing to push
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "No trello_card_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cardId = post.trello_card_id;
    const results: Record<string, any> = {};

    // Push card name/description update
    if (action === "update" || action === "update_description") {
      const updateParams = new URLSearchParams();
      updateParams.set("name", post.title);
      updateParams.set("desc", post.caption || "");
      if (post.deadline) updateParams.set("due", post.deadline);

      const res = await fetch(`${TRELLO_API}/cards/${cardId}?${authParams}`, {
        method: "PUT",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: updateParams.toString(),
      });
      results.cardUpdate = { status: res.status, ok: res.ok };
      if (!res.ok) {
        const body = await res.text();
        console.error("Card update failed:", res.status, body);
      }
    }

    // Push column/list change
    if (action === "move_column" || action === "update") {
      if (post.column_id) {
        // Get the trello_list_id for this column
        const { data: column } = await supabase
          .from("columns")
          .select("trello_list_id")
          .eq("id", post.column_id)
          .single();

        if (column?.trello_list_id) {
          const res = await fetch(
            `${TRELLO_API}/cards/${cardId}?${authParams}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: `idList=${column.trello_list_id}`,
            }
          );
          results.moveList = { status: res.status, ok: res.ok };
          if (!res.ok) {
            const body = await res.text();
            console.error("Move list failed:", res.status, body);
          }
        }
      }
    }

    // Push label changes
    if (action === "update") {
      // Get current labels on the trello card
      const labelsRes = await fetch(`${TRELLO_API}/cards/${cardId}/idLabels?${authParams}`);
      const currentLabelIds: string[] = labelsRes.ok ? await labelsRes.json() : [];
      const desiredLabelIds: string[] = post.tags || [];

      // Add missing labels
      for (const labelId of desiredLabelIds) {
        if (!currentLabelIds.includes(labelId)) {
          await fetch(`${TRELLO_API}/cards/${cardId}/idLabels?${authParams}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `value=${labelId}`,
          });
        }
      }
      // Remove extra labels
      for (const labelId of currentLabelIds) {
        if (!desiredLabelIds.includes(labelId)) {
          await fetch(`${TRELLO_API}/cards/${cardId}/idLabels/${labelId}?${authParams}`, {
            method: "DELETE",
          });
        }
      }
      results.labels = { synced: true };
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Trello push error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
