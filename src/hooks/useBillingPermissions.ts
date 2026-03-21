import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BillingPermission {
  id: string;
  client_id: string;
  user_id: string;
  can_view_invoices: boolean;
  can_download_invoices: boolean;
  can_view_attachments: boolean;
  can_download_attachments: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingAccessLog {
  id: string;
  client_id: string;
  user_id: string;
  user_name: string;
  action: string;
  document_type: string;
  document_id: string | null;
  document_name: string;
  created_at: string;
}

export function useBillingPermissions(clientId: string) {
  const [permissions, setPermissions] = useState<BillingPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("client_billing_permissions")
      .select("*")
      .eq("client_id", clientId);
    setPermissions((data as any[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { permissions, loading, refetch: fetch };
}

export function useMyBillingPermission(clientId: string) {
  const [permission, setPermission] = useState<BillingPermission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data } = await supabase
        .from("client_billing_permissions")
        .select("*")
        .eq("client_id", clientId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) {
        const perm = data as any as BillingPermission;
        // Check expiry
        if (perm.expires_at && new Date(perm.expires_at) < new Date()) {
          setPermission(null);
        } else {
          setPermission(perm);
        }
      }
      setLoading(false);
    };
    load();
  }, [clientId]);

  return { permission, loading };
}

export async function upsertBillingPermission(data: {
  client_id: string;
  user_id: string;
  can_view_invoices: boolean;
  can_download_invoices: boolean;
  can_view_attachments: boolean;
  can_download_attachments: boolean;
  expires_at?: string | null;
}) {
  const { error } = await supabase
    .from("client_billing_permissions")
    .upsert(data as any, { onConflict: "client_id,user_id" });
  if (error) throw error;
}

export async function deleteBillingPermission(clientId: string, userId: string) {
  const { error } = await supabase
    .from("client_billing_permissions")
    .delete()
    .eq("client_id", clientId)
    .eq("user_id", userId);
  if (error) throw error;
}

export function useBillingAccessLogs(clientId: string) {
  const [logs, setLogs] = useState<BillingAccessLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("billing_access_logs")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs((data as any[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { logs, loading, refetch: fetch };
}

export async function logBillingAccess(data: {
  client_id: string;
  user_id: string;
  user_name: string;
  action: string;
  document_type: string;
  document_id?: string;
  document_name?: string;
}) {
  await supabase.from("billing_access_logs").insert(data as any);
}
