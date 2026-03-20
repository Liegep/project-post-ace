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
  | "client_created"
  | "client_updated"
  | "client_assigned"
  | "client_unassigned"
  | "caption_edited"
  | "feedback_sent"
  | "social_post_created"
  | "social_post_published"
  | "social_post_scheduled";

export type ItemType = "post" | "brief" | "client" | "social_post" | "comment";

interface LogActivityParams {
  action: ActivityAction;
  itemType: ItemType;
  itemId?: string;
  itemTitle?: string;
  clientId?: string;
  clientName?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Get user name from profile
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

export const ACTION_LABELS: Record<ActivityAction, string> = {
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
  brief_status_changed: "alterou o status da pauta",
  brief_commented: "comentou na pauta",
  client_created: "criou o cliente",
  client_updated: "atualizou o cliente",
  client_assigned: "atribuiu acesso ao cliente",
  client_unassigned: "removeu acesso ao cliente",
  caption_edited: "editou a legenda do post",
  feedback_sent: "enviou feedback no post",
  social_post_created: "criou post social",
  social_post_published: "publicou post social",
  social_post_scheduled: "agendou post social",
};

export const ACTION_ICONS: Record<ActivityAction, string> = {
  post_approved: "CheckCircle2",
  post_change_requested: "AlertTriangle",
  post_edited: "Pencil",
  post_created: "Plus",
  post_status_changed: "ArrowRightLeft",
  post_commented: "MessageCircle",
  post_archived: "Archive",
  post_unarchived: "RotateCcw",
  post_moved: "MoveHorizontal",
  brief_created: "FileText",
  brief_status_changed: "ArrowRightLeft",
  brief_commented: "MessageCircle",
  client_created: "UserPlus",
  client_updated: "Settings",
  client_assigned: "UserPlus",
  client_unassigned: "UserMinus",
  caption_edited: "Type",
  feedback_sent: "Send",
  social_post_created: "Share2",
  social_post_published: "Globe",
  social_post_scheduled: "CalendarClock",
};
