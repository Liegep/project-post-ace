import { supabase } from "@/integrations/supabase/client";
import { serializePostDeadline } from "@/lib/postDeadline";

/**
 * Best-effort bidirectional sync between social_posts and kanban posts.
 * Match key: client_id + first non-empty line of caption == post.title (case-insensitive, trimmed).
 */

const firstLine = (text: string | null | undefined): string => {
  if (!text) return "";
  return text.split("\n").map((l) => l.trim()).find((l) => l.length > 0) || "";
};

const normalize = (s: string) => s.trim().toLowerCase();

type SocialStatus =
  | "draft" | "pending_approval" | "approved" | "scheduled"
  | "publishing" | "published" | "error" | "cancelled";

interface SocialPostLite {
  id: string;
  client_id: string;
  caption: string;
  status: SocialStatus;
  scheduled_at: string | null;
  published_at: string | null;
}

interface KanbanPostLite {
  id: string;
  client_id: string;
  title: string;
  deadline: string | null;
  tags: string[] | null;
  status: string[] | null;
}

const ensureTag = (tags: string[], tag: string, present: boolean): string[] => {
  const has = tags.includes(tag);
  if (present && !has) return [...tags, tag];
  if (!present && has) return tags.filter((t) => t !== tag);
  return tags;
};

const ensureStatus = (statuses: string[], status: string, present: boolean): string[] => {
  return ensureTag(statuses, status, present);
};

/**
 * Called when a social_post changes. Reflects scheduled_at + status onto matching kanban card.
 */
export async function syncKanbanFromSocial(sp: SocialPostLite): Promise<void> {
  try {
    const key = normalize(firstLine(sp.caption));
    if (!key) return;

    const { data: candidates } = await supabase
      .from("posts")
      .select("id, client_id, title, deadline, tags, status")
      .eq("client_id", sp.client_id)
      .eq("archived", false) as any;

    const match = (candidates as KanbanPostLite[] | null)?.find(
      (p) => normalize(p.title || "") === key
    );
    if (!match) return;

    const updates: Record<string, any> = {};

    // Sync deadline from scheduled_at (date-only, local noon)
    if (sp.scheduled_at) {
      const serialized = serializePostDeadline(sp.scheduled_at);
      if (serialized && serialized !== match.deadline) {
        updates.deadline = serialized;
      }
    }

    // Sync tags & status flags
    const currTags = match.tags || [];
    const currStatus = match.status || [];

    const isScheduled = sp.status === "scheduled" || sp.status === "approved";
    const isPublished = sp.status === "published";

    let nextTags = ensureTag(currTags, "agendado", isScheduled && !isPublished);
    nextTags = ensureTag(nextTags, "publicado", isPublished);
    if (JSON.stringify(nextTags) !== JSON.stringify(currTags)) {
      updates.tags = nextTags;
    }

    let nextStatus = ensureStatus(currStatus, "agendado", isScheduled && !isPublished);
    if (JSON.stringify(nextStatus) !== JSON.stringify(currStatus)) {
      updates.status = nextStatus;
    }

    if (isPublished && !match.tags?.includes("publicado")) {
      updates.archived = true;
      updates.archived_at = new Date().toISOString();
      updates.published_at = sp.published_at || new Date().toISOString();
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("posts").update(updates as any).eq("id", match.id);
    }
  } catch (e) {
    console.warn("[socialKanbanSync] syncKanbanFromSocial failed", e);
  }
}

/**
 * Called when a kanban post changes. Reflects deadline + tags onto matching social_post.
 */
export async function syncSocialFromKanban(params: {
  postId: string;
  clientId: string;
  title: string;
  deadline: Date | string | null | undefined;
  tags: string[] | undefined;
}): Promise<void> {
  try {
    const titleKey = normalize(params.title || "");
    if (!titleKey || !params.clientId) return;

    const { data: candidates } = await supabase
      .from("social_posts")
      .select("id, client_id, caption, status, scheduled_at")
      .eq("client_id", params.clientId)
      .in("status", ["draft", "pending_approval", "approved", "scheduled"]) as any;

    const match = (candidates as SocialPostLite[] | null)?.find(
      (sp) => normalize(firstLine(sp.caption)) === titleKey
    );
    if (!match) return;

    const updates: Record<string, any> = {};

    // Sync scheduled_at from deadline (preserve time-of-day from existing scheduled_at if present)
    if (params.deadline !== undefined) {
      const d = params.deadline ? new Date(params.deadline) : null;
      if (d && !Number.isNaN(d.getTime())) {
        const existing = match.scheduled_at ? new Date(match.scheduled_at) : null;
        const target = new Date(d);
        if (existing && !Number.isNaN(existing.getTime())) {
          target.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
        } else {
          target.setHours(12, 0, 0, 0);
        }
        const iso = target.toISOString();
        if (iso !== match.scheduled_at) {
          updates.scheduled_at = iso;
        }
      }
    }

    // If kanban marks "publicado" and social is not yet published, leave social_publish flow alone.
    // If kanban removes "agendado" tag and social is scheduled, revert social to approved (cancel auto-schedule signal).
    const tags = params.tags;
    if (tags) {
      const wantsScheduled = tags.includes("agendado");
      if (!wantsScheduled && match.status === "scheduled") {
        updates.status = "approved";
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("social_posts").update(updates as any).eq("id", match.id);
    }
  } catch (e) {
    console.warn("[socialKanbanSync] syncSocialFromKanban failed", e);
  }
}
