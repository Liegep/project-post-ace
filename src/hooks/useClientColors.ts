import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useClientColors() {
  const [colors, setColors] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  const fetchColors = useCallback(async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id, calendar_color");
    if (error) {
      console.error("[useClientColors] fetch error", error);
      setLoading(false);
      return;
    }
    const map: Record<string, string | null> = {};
    (data || []).forEach((c: any) => {
      map[c.id] = c.calendar_color ?? null;
    });
    setColors(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchColors();
  }, [fetchColors]);

  const setColor = useCallback(async (clientId: string, hex: string | null) => {
    setColors((prev) => ({ ...prev, [clientId]: hex }));
    const { error } = await supabase
      .from("clients")
      .update({ calendar_color: hex })
      .eq("id", clientId);
    if (error) {
      console.error("[useClientColors] update error", error);
      toast.error("Não foi possível salvar a cor");
      fetchColors();
    }
  }, [fetchColors]);

  return { colors, setColor, loading, refresh: fetchColors };
}
