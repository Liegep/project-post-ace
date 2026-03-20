import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAppLogo() {
  const [appLogo, setAppLogo] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "app_logo_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setAppLogo(data.value);
      });
  }, []);

  return appLogo;
}
