import { useEffect, useState } from "react";

export interface NagerHoliday {
  date: string; // YYYY-MM-DD
  localName: string;
  name: string;
  countryCode: string;
  fixed: boolean;
  global: boolean;
  types: string[];
}

export interface NagerCountry {
  countryCode: string;
  name: string;
}

const HOLIDAYS_CACHE = new Map<string, NagerHoliday[]>();
let COUNTRIES_CACHE: NagerCountry[] | null = null;

const COUNTRY_COLORS: Record<string, string> = {
  BR: "#009c3b",
  US: "#3c3b6e",
  PT: "#006400",
  IT: "#008c45",
  ES: "#c60b1e",
  FR: "#0055a4",
  DE: "#000000",
  GB: "#012169",
  SE: "#006aa7",
  NO: "#ba0c2f",
  DK: "#c8102e",
  FI: "#003580",
  NL: "#21468b",
  BE: "#fdda24",
  CH: "#d52b1e",
  AT: "#ed2939",
  IE: "#169b62",
  PL: "#dc143c",
  AR: "#74acdf",
  MX: "#006847",
  CA: "#ff0000",
  JP: "#bc002d",
  AU: "#012169",
};

export function getCountryColor(code: string): string {
  return COUNTRY_COLORS[code.toUpperCase()] || "#3b82f6";
}

export async function fetchNagerCountries(): Promise<NagerCountry[]> {
  if (COUNTRIES_CACHE) return COUNTRIES_CACHE;
  try {
    const res = await fetch("https://date.nager.at/api/v3/AvailableCountries");
    if (!res.ok) throw new Error("Failed to load countries");
    const data = (await res.json()) as NagerCountry[];
    COUNTRIES_CACHE = data;
    return data;
  } catch {
    return [];
  }
}

export async function fetchNagerHolidays(
  year: number,
  countryCode: string,
): Promise<NagerHoliday[]> {
  const key = `${year}-${countryCode.toUpperCase()}`;
  if (HOLIDAYS_CACHE.has(key)) return HOLIDAYS_CACHE.get(key)!;
  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode.toUpperCase()}`,
    );
    if (!res.ok) throw new Error("Failed to load holidays");
    const data = (await res.json()) as NagerHoliday[];
    HOLIDAYS_CACHE.set(key, data);
    return data;
  } catch {
    return [];
  }
}

function detectBrowserCountry(): string {
  if (typeof navigator === "undefined") return "BR";
  const lang = navigator.language || "en-US";
  const parts = lang.split("-");
  if (parts.length > 1) return parts[1].toUpperCase();
  // Fallback by language
  const map: Record<string, string> = {
    pt: "BR",
    en: "US",
    it: "IT",
    es: "ES",
    sv: "SE",
    de: "DE",
    fr: "FR",
  };
  return map[parts[0].toLowerCase()] || "BR";
}

const STORAGE_KEY = "nager_country_code";

export function useNagerHolidays(initialYear?: number) {
  const [year, setYear] = useState<number>(initialYear ?? new Date().getFullYear());
  const [countryCode, setCountryCodeState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
    }
    return detectBrowserCountry();
  });
  const [holidays, setHolidays] = useState<NagerHoliday[]>([]);
  const [countries, setCountries] = useState<NagerCountry[]>([]);
  const [loading, setLoading] = useState(false);

  const setCountryCode = (code: string) => {
    setCountryCodeState(code);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, code);
    }
  };

  useEffect(() => {
    fetchNagerCountries().then(setCountries);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchNagerHolidays(year, countryCode).then((data) => {
      if (!cancelled) {
        setHolidays(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [year, countryCode]);

  return {
    year,
    setYear,
    countryCode,
    setCountryCode,
    holidays,
    countries,
    loading,
  };
}
