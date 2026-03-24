import { supabase } from "@/integrations/supabase/client";

// Only approval and feedback actions are logged now
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
  | "client_created"
  | "client_updated"
  | "client_assigned"
  | "client_unassigned"
  | "caption_edited"
  | "feedback_sent"
  | "social_post_created"
  | "social_post_published"
  | "social_post_scheduled"
  | "report_created"
  | "report_updated"
  | "report_published";

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

// Only these actions actually get persisted — all others silently no-op
const ALLOWED_ACTIONS: Set<string> = new Set([
  "post_approved",
  "post_change_requested",
  "feedback_sent",
]);

export async function logActivity(params: LogActivityParams) {
  // Only log client approval/feedback actions — skip everything else
  if (!ALLOWED_ACTIONS.has(params.action)) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", session.user.id)
      .maybeSingle();

    const userName = profile?.full_name || profile?.email || session.user.email || "Usuário";

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
  feedback_sent: "enviou feedback no post",
};

export const ACTION_ICONS: Record<string, string> = {
  post_approved: "CheckCircle2",
  post_change_requested: "AlertTriangle",
  feedback_sent: "Send",
};
