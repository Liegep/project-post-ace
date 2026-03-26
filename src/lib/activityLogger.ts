import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "post_approved"
  | "post_change_requested"
  | "post_edited"
  | "post_created"
  | "post_status_changed"
  | "post_commented"
  | "post_archived"
  | "post_unarchived"
  | "post_moved"
  | "brief_created"
  | "brief_status_changed"
  | "brief_commented"
  | "caption_edited"
  | "feedback_sent"
  | "post_viewed"
  | "post_downloaded";

export type ItemType = "post" | "brief" | "client" | "social_post" | "comment" | "report";

interface LogActivityParams {
  action: ActivityAction;
  itemType: ItemType;
  itemId?: string;
  itemTitle?: string;
  clientId?: string;
  clientName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Logs activity ONLY for users with the 'client' role.
 * Admin/team actions are silently skipped.
 */
export async function logActivity(params: LogActivityParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Check if the user has the 'client' role — skip logging for all other roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);

    const isClient = roles?.some(r => r.role === "client");
    if (!isClient) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", session.user.id)
      .maybeSingle();

    const userName = profile?.full_name || profile?.email || session.user.email || "Cliente";

    await supabase.from("activity_logs" as any).insert({
      user_id: session.user.id,
      user_name: userName,
      action: params.action,
      item_type: params.itemType,
      item_id: params.itemId || null,
      item_title: params.itemTitle || "",
      client_id: params.clientId || null,
      client_name: params.clientName || "",
      metadata: params.metadata || {},
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

export const ACTION_LABELS: Record<string, string> = {
  post_approved: "aprovou o post",
  post_change_requested: "solicitou alteração no post",
  post_edited: "editou o post",
  post_created: "criou o post",
  post_status_changed: "alterou o status do post",
  post_commented: "comentou no post",
  post_archived: "arquivou o post",
  post_unarchived: "desarquivou o post",
  post_moved: "moveu o post",
  brief_created: "criou a pauta",
  brief_status_changed: "alterou status da pauta",
  brief_commented: "comentou na pauta",
  caption_edited: "editou a legenda",
  feedback_sent: "enviou feedback no post",
  post_viewed: "visualizou o post",
  post_downloaded: "baixou arquivo do post",
};

export const ACTION_ICONS: Record<string, string> = {
  post_approved: "CheckCircle2",
  post_change_requested: "AlertTriangle",
  post_edited: "Pencil",
  post_created: "Plus",
  post_status_changed: "ArrowRightLeft",
  post_commented: "MessageSquare",
  post_archived: "Archive",
  post_unarchived: "ArchiveRestore",
  post_moved: "MoveHorizontal",
  brief_created: "FileText",
  brief_status_changed: "ArrowRightLeft",
  brief_commented: "MessageSquare",
  caption_edited: "Type",
  feedback_sent: "Send",
  post_viewed: "Eye",
  post_downloaded: "Download",
};
