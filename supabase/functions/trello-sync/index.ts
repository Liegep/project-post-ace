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

    const { boardId: rawBoardId, clientId } = await req.json();
    if (!rawBoardId || !clientId) throw new Error("boardId and clientId are required");

    let boardId = rawBoardId.trim().replace(/\/+$/, "");
    const urlMatch = boardId.match(/trello\.com\/(?:invite\/)?b\/([^\/]+)/);
    if (urlMatch) boardId = urlMatch[1];

    console.log("Board ID:", boardId);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authParams = new URLSearchParams({ key: TRELLO_API_KEY, token: TRELLO_TOKEN });

    const fetchTrelloJson = async (path: string, context: string) => {
      const url = `${TRELLO_API}${path}${path.includes("?") ? "&" : "?"}${authParams.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        const body = await response.text();
        console.error(`${context} response:`, response.status, body);
        if (response.status === 401) {
          throw new Error(`Trello access denied for board ${boardId}.`);
        }
        throw new Error(`Failed to fetch ${context}: ${response.status}`);
      }
      return response.json();
    };

    await fetchTrelloJson(`/boards/${boardId}?fields=id,name,closed`, "board");

    const trelloLabels = await fetchTrelloJson(`/boards/${boardId}/labels`, "labels");
    const trelloLists = await fetchTrelloJson(`/boards/${boardId}/lists`, "lists");
    const trelloCards = await fetchTrelloJson(
      `/boards/${boardId}/cards?fields=name,desc,due,idList,idLabels,pos&attachments=true`,
      "cards"
    );

    // --- Sync Labels/Tags (upsert by trello label id) ---
    let tagsCount = 0;
    for (const label of trelloLabels) {
      if (!label.name) continue;
      const colorMap: Record<string, string> = {
        green: "#22c55e", yellow: "#eab308", orange: "#f97316", red: "#ef4444",
        purple: "#8b5cf6", blue: "#3b82f6", sky: "#0ea5e9", lime: "#84cc16",
        pink: "#ec4899", black: "#1f2937", green_dark: "#16a34a",
        yellow_dark: "#ca8a04", orange_dark: "#ea580c", red_dark: "#dc2626",
        purple_dark: "#7c3aed", blue_dark: "#2563eb",
      };
      await supabase.from("tags").upsert({
        id: label.id,
        name: label.name,
        color: colorMap[label.color] || "#6b7280",
        client_id: clientId,
      }, { onConflict: "id" });
      tagsCount++;
    }

    // --- Sync Lists/Columns (non-destructive via trello_list_id) ---
    const columnIdMap: Record<string, string> = {}; // trelloListId -> supabase column id
    for (let i = 0; i < trelloLists.length; i++) {
      const list = trelloLists[i];
      // Check if column with this trello_list_id already exists
      const { data: existing } = await supabase
        .from("columns")
        .select("id")
        .eq("trello_list_id", list.id)
        .eq("client_id", clientId)
        .maybeSingle();

      if (existing) {
        // Update name/position
        await supabase.from("columns").update({ name: list.name, position: i }).eq("id", existing.id);
        columnIdMap[list.id] = existing.id;
      } else {
        const { data } = await supabase
          .from("columns")
          .insert({ client_id: clientId, name: list.name, position: i, trello_list_id: list.id })
          .select("id")
          .single();
        if (data) columnIdMap[list.id] = data.id;
      }
    }

    // --- Sync Cards/Posts (non-destructive via trello_card_id) ---
    let postsCreated = 0;
    let postsUpdated = 0;
    for (const card of trelloCards) {
      const imageAttachment = card.attachments?.find((a: any) => a.mimeType?.startsWith("image/"));
      const imageUrl = imageAttachment?.url || "";
      const mediaUrls = (card.attachments || [])
        .filter((a: any) => a.mimeType?.startsWith("image/") || a.mimeType?.startsWith("video/"))
        .map((a: any) => a.url);
      const mediaType = mediaUrls.some((u: string) =>
        card.attachments?.find((a: any) => a.url === u && a.mimeType?.startsWith("video/"))
      ) ? "video" : "image";

      const postFields = {
        title: card.name,
        image_url: imageUrl,
        media_type: mediaType,
        media_urls: mediaUrls.length > 0 ? mediaUrls : imageUrl ? [imageUrl] : [],
        caption: card.desc || "",
        deadline: card.due || null,
        tags: card.idLabels || [],
        client_id: clientId,
        column_id: columnIdMap[card.idList] || null,
        trello_card_id: card.id,
      };

      // Check if post with this trello_card_id already exists
      const { data: existing } = await supabase
        .from("posts")
        .select("id")
        .eq("trello_card_id", card.id)
        .maybeSingle();

      if (existing) {
        // Update existing post (don't overwrite status/client_label set by user)
        const { title, image_url, media_type, media_urls, caption, deadline, tags, column_id } = postFields;
        await supabase.from("posts").update({ title, image_url, media_type, media_urls, caption, deadline, tags, column_id }).eq("id", existing.id);
        postsUpdated++;
      } else {
        await supabase.from("posts").insert({ ...postFields, status: "entrada", client_label: "pendente" });
        postsCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: { tags: tagsCount, columns: Object.keys(columnIdMap).length, postsCreated, postsUpdated },
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
