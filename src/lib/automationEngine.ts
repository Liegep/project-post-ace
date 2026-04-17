/**
 * Centralized Kanban Automation Engine
 *
 * Single source of truth for executing kanban_automations rules.
 * Every post mutation (tag add/remove, column move) must funnel through
 * `runAutomationsForPost` so that automations behave identically regardless
 * of which UI surface triggered the change.
 *
 * Key guarantees:
 *  1. Strict execution chain: detect → match → DB write → confirm → notify caller to refresh.
 *  2. Exact-match (case + diacritic + emoji safe) tag comparison.
 *  3. Race-condition prevention via in-memory per-post lock.
 *  4. Persistence is verified with `.select()` before declaring success.
 *  5. Works as a global listener — any caller in the app can invoke it.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AutomationRow {
  id: string;
  client_id: string;
  name: string;
  trigger_type: "column_move" | "tag_added" | string;
  trigger_column_id: string | null;
  trigger_value: string;
  action_type: "add_tag" | "change_color" | "mark_done" | "move_to_column" | string;
  action_value: string;
  active: boolean;
}

export interface AutomationResult {
  postId: string;
  appliedActions: Array<{
    automationId: string;
    automationName: string;
    actionType: string;
    actionValue: string;
    success: boolean;
    error?: string;
  }>;
  /**
   * The set of fields touched on the posts row. Useful for the caller to
   * know what to refresh in local state.
   */
  mutatedFields: Set<"tags" | "client_label" | "archived" | "column_id">;
}

export interface AutomationContext {
  clientId: string;
  /** Resolves a tag identifier (UUID or legacy slug) to its display name. */
  tagIdToName: Map<string, string>;
}

/** Per-post processing locks to prevent re-entrant execution. */
const processingLocks = new Set<string>();

/**
 * Normalize a string for exact tag matching. Handles emojis, combining marks,
 * stray whitespace and casing. Does NOT strip emojis — those are kept as-is
 * after Unicode NFC normalization so "❤️" still matches "❤️".
 */
export function normalizeTagValue(input: string | null | undefined): string {
  if (!input) return "";
  return String(input).normalize("NFC").trim().toLowerCase();
}

/** Check if two tag values match exactly after normalization. */
export function tagMatches(a: string, b: string): boolean {
  return normalizeTagValue(a) === normalizeTagValue(b);
}

/** Resolve an arbitrary tag identifier (UUID or slug) to its display name. */
function resolveTagName(rawId: string, tagIdToName: Map<string, string>): string {
  return tagIdToName.get(rawId) ?? rawId;
}

/**
 * Fetch all active automations for a client, scoped by trigger type.
 * Centralized so the rules read is consistent everywhere.
 */
async function fetchAutomations(
  clientId: string,
  triggerType: "column_move" | "tag_added",
  filter?: { triggerColumnId?: string | null }
): Promise<AutomationRow[]> {
  let query = supabase
    .from("kanban_automations")
    .select("*")
    .eq("client_id", clientId)
    .eq("trigger_type", triggerType)
    .eq("active", true);

  if (triggerType === "column_move" && filter?.triggerColumnId) {
    query = query.eq("trigger_column_id", filter.triggerColumnId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[automationEngine] fetchAutomations error", error);
    return [];
  }
  return (data || []) as AutomationRow[];
}

/**
 * Persist a single automation action to Supabase and confirm with .select().
 * Returns the freshly persisted row fields needed for local state refresh.
 */
async function persistAction(
  auto: AutomationRow,
  postId: string
): Promise<{ ok: boolean; error?: string; mutatedField?: AutomationResult["mutatedFields"] extends Set<infer T> ? T : never }> {
  switch (auto.action_type) {
    case "add_tag": {
      // Read current tags, append, write back, verify.
      const { data: current, error: readErr } = await supabase
        .from("posts")
        .select("tags")
        .eq("id", postId)
        .maybeSingle();
      if (readErr || !current) {
        return { ok: false, error: readErr?.message || "post not found" };
      }
      const currentTags: string[] = Array.isArray((current as any).tags) ? (current as any).tags : [];
      const newValue = auto.action_value;
      if (currentTags.some((t) => tagMatches(t, newValue))) {
        return { ok: true, mutatedField: "tags" }; // already there, no-op success
      }
      const nextTags = [...currentTags, newValue];
      const { data, error } = await supabase
        .from("posts")
        .update({ tags: nextTags } as any)
        .eq("id", postId)
        .select("id");
      if (error || !data || data.length === 0) {
        return { ok: false, error: error?.message || "update returned 0 rows" };
      }
      return { ok: true, mutatedField: "tags" };
    }

    case "change_color": {
      const value = `color:${auto.action_value}`;
      const { data, error } = await supabase
        .from("posts")
        .update({ client_label: value } as any)
        .eq("id", postId)
        .select("id");
      if (error || !data || data.length === 0) {
        return { ok: false, error: error?.message || "update returned 0 rows" };
      }
      return { ok: true, mutatedField: "client_label" };
    }

    case "mark_done": {
      const { data, error } = await supabase
        .from("posts")
        .update({ archived: true, archived_at: new Date().toISOString() } as any)
        .eq("id", postId)
        .select("id");
      if (error || !data || data.length === 0) {
        return { ok: false, error: error?.message || "update returned 0 rows" };
      }
      return { ok: true, mutatedField: "archived" };
    }

    case "move_to_column": {
      const targetColId = auto.action_value;
      if (!targetColId) return { ok: false, error: "missing target column id" };
      const { data, error } = await supabase
        .from("posts")
        .update({ column_id: targetColId } as any)
        .eq("id", postId)
        .select("id");
      if (error || !data || data.length === 0) {
        return { ok: false, error: error?.message || "update returned 0 rows" };
      }
      return { ok: true, mutatedField: "column_id" };
    }

    default:
      return { ok: false, error: `unknown action_type: ${auto.action_type}` };
  }
}

interface RunAutomationsArgs {
  ctx: AutomationContext;
  postId: string;
  /** Tag-added trigger: identifiers (UUID or slug) that were newly added. */
  addedTagIds?: string[];
  /** Column-move trigger: the destination column id, if changed. */
  newColumnId?: string | null;
  /** The previous column id, to detect actual moves. */
  previousColumnId?: string | null;
}

/**
 * Centralized engine entry point. Runs every applicable automation for a
 * single post in response to a tag/column change. Safe to call from any
 * mutation site — locking prevents duplicate execution.
 */
export async function runAutomationsForPost(args: RunAutomationsArgs): Promise<AutomationResult> {
  const { ctx, postId } = args;
  const result: AutomationResult = {
    postId,
    appliedActions: [],
    mutatedFields: new Set(),
  };

  if (!ctx.clientId) return result;

  // Race-condition guard: skip if this post is already being processed.
  if (processingLocks.has(postId)) {
    console.debug("[automationEngine] skip – post already processing", postId);
    return result;
  }
  processingLocks.add(postId);

  try {
    const matched: AutomationRow[] = [];

    // ─── Step 1+2: Detect & match tag-added triggers ─────────────────────
    if (args.addedTagIds && args.addedTagIds.length > 0) {
      const addedNames = args.addedTagIds.map((id) =>
        normalizeTagValue(resolveTagName(id, ctx.tagIdToName))
      );
      const tagAutomations = await fetchAutomations(ctx.clientId, "tag_added");
      for (const auto of tagAutomations) {
        const triggerName = normalizeTagValue(auto.trigger_value);
        if (triggerName && addedNames.includes(triggerName)) {
          matched.push(auto);
        }
      }
    }

    // ─── Step 1+2: Detect & match column-move triggers ───────────────────
    if (
      args.newColumnId !== undefined &&
      args.newColumnId !== null &&
      args.newColumnId !== args.previousColumnId
    ) {
      const colAutomations = await fetchAutomations(ctx.clientId, "column_move", {
        triggerColumnId: args.newColumnId,
      });
      matched.push(...colAutomations);
    }

    if (matched.length === 0) return result;

    // ─── Step 3: Persist each action sequentially ────────────────────────
    for (const auto of matched) {
      const { ok, error, mutatedField } = await persistAction(auto, postId);
      result.appliedActions.push({
        automationId: auto.id,
        automationName: auto.name,
        actionType: auto.action_type,
        actionValue: auto.action_value,
        success: ok,
        error,
      });
      if (ok && mutatedField) result.mutatedFields.add(mutatedField);
      if (!ok) {
        console.error("[automationEngine] action failed", { auto, postId, error });
      }
    }
  } finally {
    processingLocks.delete(postId);
  }

  return result;
}

/** Expose lock state for UI feedback (e.g. a "processing" badge on a card). */
export function isPostProcessingAutomations(postId: string): boolean {
  return processingLocks.has(postId);
}
