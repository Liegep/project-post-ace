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

    if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
      throw new Error("Trello credentials not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const { boardId: rawBoardId, clientId } = await req.json();
    if (!rawBoardId || !clientId) {
      throw new Error("boardId and clientId are required");
    }
    // Sanitize board ID: remove trailing slashes, whitespace, and extract ID from full URLs
    let boardId = rawBoardId.trim().replace(/\/+$/, '');
    // Handle full Trello URLs like https://trello.com/b/BOARD_ID/board-name
    const urlMatch = boardId.match(/trello\.com\/b\/([^\/]+)/);
    if (urlMatch) boardId = urlMatch[1];

    console.log("Using Trello API Key (first 4 chars):", TRELLO_API_KEY?.substring(0, 4));
    console.log("Using Trello Token (first 4 chars):", TRELLO_TOKEN?.substring(0, 4));
    console.log("Board ID:", boardId);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authParams = `key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`;

    // 1. Fetch board labels
    const labelsUrl = `${TRELLO_API}/boards/${boardId}/labels?${authParams}`;
    console.log("Fetching labels from:", labelsUrl.replace(TRELLO_TOKEN!, '***').replace(TRELLO_API_KEY!, '***'));
    const labelsRes = await fetch(labelsUrl);
    if (!labelsRes.ok) {
      const body = await labelsRes.text();
      console.error("Labels response:", labelsRes.status, body);
      throw new Error(`Failed to fetch labels: ${labelsRes.status}`);
    }
    const trelloLabels = await labelsRes.json();

    // 2. Fetch board lists (columns)
    const listsRes = await fetch(`${TRELLO_API}/boards/${boardId}/lists?${authParams}`);
    if (!listsRes.ok) throw new Error(`Failed to fetch lists: ${listsRes.status}`);
    const trelloLists = await listsRes.json();

    // 3. Fetch board cards
    const cardsRes = await fetch(
      `${TRELLO_API}/boards/${boardId}/cards?fields=name,desc,due,idList,idLabels,pos&attachments=true&${authParams}`
    );
    if (!cardsRes.ok) throw new Error(`Failed to fetch cards: ${cardsRes.status}`);
    const trelloCards = await cardsRes.json();

    // --- Sync Labels/Tags ---
    const tagResults = [];
    for (const label of trelloLabels) {
      if (!label.name) continue;
      const colorMap: Record<string, string> = {
        green: "#22c55e", yellow: "#eab308", orange: "#f97316", red: "#ef4444",
        purple: "#8b5cf6", blue: "#3b82f6", sky: "#0ea5e9", lime: "#84cc16",
        pink: "#ec4899", black: "#1f2937", green_dark: "#16a34a",
        yellow_dark: "#ca8a04", orange_dark: "#ea580c", red_dark: "#dc2626",
        purple_dark: "#7c3aed", blue_dark: "#2563eb",
      };
      const tagData = {
        id: label.id,
        name: label.name,
        color: colorMap[label.color] || "#6b7280",
        client_id: clientId,
      };
      const { error } = await supabase.from("tags").upsert(tagData, { onConflict: "id" });
      tagResults.push({ id: label.id, name: label.name, error: error?.message });
    }

    // --- Sync Lists/Columns ---
    // First delete existing columns for this client, then insert fresh
    await supabase.from("columns").delete().eq("client_id", clientId);

    const columnIdMap: Record<string, string> = {};
    for (let i = 0; i < trelloLists.length; i++) {
      const list = trelloLists[i];
      const { data, error } = await supabase
        .from("columns")
        .insert({ client_id: clientId, name: list.name, position: i })
        .select("id")
        .single();
      if (data) {
        columnIdMap[list.id] = data.id;
      }
    }

    // --- Sync Cards/Posts ---
    // Delete existing posts for this client before importing
    await supabase.from("posts").delete().eq("client_id", clientId);

    let postsCreated = 0;
    for (const card of trelloCards) {
      // Get first image attachment as cover
      const imageAttachment = card.attachments?.find(
        (a: any) => a.mimeType?.startsWith("image/")
      );
      const imageUrl = imageAttachment?.url || "";

      // Collect all image attachments
      const mediaUrls = (card.attachments || [])
        .filter((a: any) => a.mimeType?.startsWith("image/") || a.mimeType?.startsWith("video/"))
        .map((a: any) => a.url);

      const mediaType = mediaUrls.some((u: string) =>
        card.attachments?.find((a: any) => a.url === u && a.mimeType?.startsWith("video/"))
      )
        ? "video"
        : "image";

      const postData = {
        title: card.name,
        image_url: imageUrl,
        media_type: mediaType,
        media_urls: mediaUrls.length > 0 ? mediaUrls : imageUrl ? [imageUrl] : [],
        caption: card.desc || "",
        deadline: card.due || null,
        status: "entrada",
        client_label: "pendente",
        tags: card.idLabels || [],
        client_id: clientId,
        column_id: columnIdMap[card.idList] || null,
      };

      const { error } = await supabase.from("posts").insert(postData);
      if (!error) postsCreated++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          tags: tagResults.length,
          columns: Object.keys(columnIdMap).length,
          posts: postsCreated,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Trello sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
