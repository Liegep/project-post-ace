import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LegendEntry {
  color: string;
  label: string;
}

export function useCalendarLegend(clientId: string) {
  const [legend, setLegend] = useState<LegendEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("calendar_legend")
      .eq("id", clientId)
      .maybeSingle();
    const raw = (data as any)?.calendar_legend;
    setLegend(Array.isArray(raw) ? (raw as LegendEntry[]) : []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    if (clientId) load();
  }, [clientId, load]);

  const save = useCallback(async (next: LegendEntry[]) => {
    setLegend(next);
    await supabase
      .from("clients")
      .update({ calendar_legend: next as any })
      .eq("id", clientId);
  }, [clientId]);

  return { legend, setLegend: save, loading, reload: load };
}
