const TRELLO_PUSH_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/trello-push`;

export async function pushToTrello(postId: string, action: "update" | "move_column" | "update_description") {
  try {
    const res = await fetch(TRELLO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ postId, action }),
    });
    const data = await res.json();
    if (!data.success && !data.skipped) {
      console.warn("Trello push failed:", data.error);
    }
    return data;
  } catch (err) {
    console.warn("Trello push error:", err);
    return { success: false };
  }
}
