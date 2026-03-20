import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ActivityAction } from "@/lib/activityLogger";

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: ActivityAction;
  itemType: string;
  itemId: string | null;
  itemTitle: string;
  clientId: string | null;
  clientName: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface UseActivityLogsOptions {
  clientId?: string;
  itemId?: string;
  itemType?: string;
  userId?: string;
  action?: string;
  limit?: number;
  enabled?: boolean;
}

export function useActivityLogs(options: UseActivityLogsOptions = {}) {
  const { clientId, itemId, itemType, userId, action, limit = 50, enabled = true } = options;
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  const fetchLogs = useCallback(async (pageNum: number, append = false) => {
    if (!enabled) return;
    setLoading(true);
    try {
      let query = supabase
        .from("activity_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .range(pageNum * limit, (pageNum + 1) * limit - 1);

      if (clientId) query = query.eq("client_id", clientId);
      if (itemId) query = query.eq("item_id", itemId);
      if (itemType) query = query.eq("item_type", itemType);
      if (userId) query = query.eq("user_id", userId);
      if (action) query = query.eq("action", action);

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        action: row.action as ActivityAction,
        itemType: row.item_type,
        itemId: row.item_id,
        itemTitle: row.item_title,
        clientId: row.client_id,
        clientName: row.client_name,
        metadata: row.metadata || {},
        createdAt: row.created_at,
      }));

      setHasMore(mapped.length === limit);
      setLogs(prev => append ? [...prev, ...mapped] : mapped);
    } catch (err) {
      console.error("Failed to fetch activity logs:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId, itemId, itemType, userId, action, limit, enabled]);

  useEffect(() => {
    setPage(0);
    fetchLogs(0);
  }, [fetchLogs]);

  const loadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchLogs(next, true);
  }, [page, fetchLogs]);

  const refresh = useCallback(() => {
    setPage(0);
    fetchLogs(0);
  }, [fetchLogs]);

  return { logs, loading, hasMore, loadMore, refresh };
}
