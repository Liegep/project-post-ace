import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Locale, translations } from "./translations";
import { supabase } from "@/integrations/supabase/client";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof typeof translations.pt) => string;
  clientLocale: Locale;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>("pt");
  const [clientLocale, setClientLocale] = useState<Locale>("pt");

  // Load saved client locale from DB
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "client_locale")
        .maybeSingle();
      if (data?.value) {
        setClientLocale(data.value as Locale);
      }
    };
    load();
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  const saveClientLocale = useCallback(async (newLocale: Locale) => {
    setClientLocale(newLocale);
    const { data } = await supabase
      .from("app_settings")
      .select("key")
      .eq("key", "client_locale")
      .maybeSingle();
    if (data) {
      await supabase.from("app_settings").update({ value: newLocale }).eq("key", "client_locale");
    } else {
      await supabase.from("app_settings").insert({ key: "client_locale", value: newLocale });
    }
  }, []);

  // Expose saveClientLocale via context by overriding setLocale behavior based on usage
  // We'll use a combined approach: admin sets both, client reads clientLocale

  const t = useCallback(
    (key: keyof typeof translations.pt) => translations[locale][key] || key,
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, clientLocale }}>
      <ClientLocaleSetter saveClientLocale={saveClientLocale}>
        {children}
      </ClientLocaleSetter>
    </I18nContext.Provider>
  );
};

// Internal context for admin to save client locale
const ClientLocaleSetterContext = createContext<(locale: Locale) => Promise<void>>(async () => {});

const ClientLocaleSetter: React.FC<{ saveClientLocale: (l: Locale) => Promise<void>; children: React.ReactNode }> = ({ saveClientLocale, children }) => (
  <ClientLocaleSetterContext.Provider value={saveClientLocale}>
    {children}
  </ClientLocaleSetterContext.Provider>
);

export const useSetClientLocale = () => useContext(ClientLocaleSetterContext);

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};

export const useClientI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useClientI18n must be used within I18nProvider");
  const tClient = useCallback(
    (key: keyof typeof translations.pt) => translations[ctx.clientLocale][key] || key,
    [ctx.clientLocale]
  );
  return { t: tClient, locale: ctx.clientLocale };
};
