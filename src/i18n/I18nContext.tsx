import React, { createContext, useContext, useState, useCallback } from "react";
import { Locale, translations } from "./translations";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof typeof translations.pt) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode; defaultLocale?: Locale; forceLocale?: Locale }> = ({ children, defaultLocale = "pt", forceLocale }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (forceLocale) return forceLocale;
    const saved = localStorage.getItem("admin_locale");
    return (saved as Locale) || defaultLocale;
  });

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    localStorage.setItem("admin_locale", loc);
  }, []);

  const t = useCallback(
    (key: keyof typeof translations.pt) => translations[locale][key] || key,
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
