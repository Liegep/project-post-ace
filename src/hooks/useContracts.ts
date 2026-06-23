import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Contract {
  id: string;
  client_id: string;
  title: string;
  body: string;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  client_name?: string;
  accepted_at?: string | null;
  accepted_by?: string | null;
}

export interface ContractAcceptance {
  id: string;
  contract_id: string;
  user_id: string;
  accepted_at: string;
  ip_address: string;
}

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const clientIds = [...new Set(data.map((c: any) => c.client_id))];
      const contractIds = data.map((c: any) => c.id);

      const [{ data: clients }, { data: acceptances }] = await Promise.all([
        supabase.from("clients").select("id, name").in("id", clientIds),
        supabase
          .from("contract_acceptances")
          .select("contract_id, user_id, accepted_at")
          .in("contract_id", contractIds)
          .order("accepted_at", { ascending: true }),
      ]);

      const clientMap = new Map((clients || []).map((c: any) => [c.id, c.name]));
      const acceptanceMap = new Map<string, { accepted_at: string; user_id: string }>();
      (acceptances || []).forEach((a: any) => {
        if (!acceptanceMap.has(a.contract_id)) {
          acceptanceMap.set(a.contract_id, { accepted_at: a.accepted_at, user_id: a.user_id });
        }
      });

      setContracts(
        data.map((c: any) => {
          const acc = acceptanceMap.get(c.id);
          return {
            ...c,
            client_name: clientMap.get(c.client_id) || "—",
            accepted_at: acc?.accepted_at ?? null,
            accepted_by: acc?.user_id ?? null,
          };
        })
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const createContract = async (clientId: string, title: string, body: string, userId: string) => {
    const { error } = await supabase.from("contracts").insert({
      client_id: clientId,
      title,
      body,
      created_by: userId,
    });
    if (!error) await fetchContracts();
    return { error };
  };

  const updateContract = async (id: string, updates: Partial<Pick<Contract, "title" | "body" | "status">>) => {
    const { error } = await supabase.from("contracts").update(updates).eq("id", id);
    if (!error) await fetchContracts();
    return { error };
  };

  const deleteContract = async (id: string) => {
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (!error) await fetchContracts();
    return { error };
  };

  return { contracts, loading, refetch: fetchContracts, createContract, updateContract, deleteContract };
}

export function usePendingContract() {
  const [pendingContract, setPendingContract] = useState<Contract | null>(null);
  const [checking, setChecking] = useState(true);

  const checkPending = useCallback(async () => {
    setChecking(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setChecking(false);
      return;
    }

    // Get client's contracts that are pending
    const { data: contracts } = await supabase
      .from("contracts")
      .select("*")
      .eq("status", "pending");

    if (!contracts || contracts.length === 0) {
      setPendingContract(null);
      setChecking(false);
      return;
    }

    // Check which ones the user already accepted
    const { data: acceptances } = await supabase
      .from("contract_acceptances")
      .select("contract_id")
      .eq("user_id", session.user.id);

    const acceptedIds = new Set((acceptances || []).map((a: any) => a.contract_id));
    const unaccepted = contracts.filter((c: any) => !acceptedIds.has(c.id));

    setPendingContract(unaccepted.length > 0 ? unaccepted[0] : null);
    setChecking(false);
  }, []);

  useEffect(() => {
    checkPending();
  }, [checkPending]);

  const acceptContract = async (contractId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { error: new Error("Not authenticated") };

    // Try to get IP
    let ip = "";
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const json = await res.json();
      ip = json.ip || "";
    } catch {}

    const { error } = await supabase.from("contract_acceptances").insert({
      contract_id: contractId,
      user_id: session.user.id,
      ip_address: ip,
    });

    if (!error) {
      setPendingContract(null);
    }
    return { error };
  };

  return { pendingContract, checking, acceptContract, recheckPending: checkPending };
}
