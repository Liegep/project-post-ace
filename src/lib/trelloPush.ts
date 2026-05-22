// Trello integration is disabled (per project policy).
// This is a no-op stub kept so existing call sites in PostsContext compile
// without firing edge function requests that would fail due to missing
// TRELLO_API_KEY / TRELLO_TOKEN secrets.
export async function pushToTrello(
  _postId: string,
  _action: "update" | "move_column" | "update_description",
) {
  return { success: true, skipped: true as const };
}
