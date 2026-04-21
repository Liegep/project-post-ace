import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IssuerDetails {
  business_name: string;
  address: string;
  country: string;
  email: string;
  tax_id: string;
  payment_method: string;
  payment_details: string;
}

export const DEFAULT_ISSUER: IssuerDetails = {
  business_name: "",
  address: "",
  country: "",
  email: "",
  tax_id: "",
  payment_method: "",
  payment_details: "",
};

const SETTINGS_KEY = "issuer_details";

export async function fetchIssuerDetails(): Promise<IssuerDetails> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  if (!data?.value) return { ...DEFAULT_ISSUER };
  try {
    return { ...DEFAULT_ISSUER, ...JSON.parse(data.value) };
  } catch {
    return { ...DEFAULT_ISSUER };
  }
}

export async function saveIssuerDetails(details: IssuerDetails) {
  const value = JSON.stringify(details);
  const { data: existing } = await supabase
    .from("app_settings")
    .select("key")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("app_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", SETTINGS_KEY);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("app_settings")
      .insert({ key: SETTINGS_KEY, value });
    if (error) throw error;
  }
}

export function useIssuerDetails() {
  const [issuer, setIssuer] = useState<IssuerDetails>(DEFAULT_ISSUER);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const data = await fetchIssuerDetails();
    setIssuer(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { issuer, loading, refetch, setIssuer };
}
