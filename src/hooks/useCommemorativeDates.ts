import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CommemorativeDate {
  id: string;
  country: string;
  country_code: string;
  country_color: string;
  name: string;
  date_month: number;
  date_day: number;
  category: string;
  description: string;
}

export const CATEGORY_LABELS: Record<string, string> = {
  feriado: "Feriado",
  cultural: "Cultural",
  comercial: "Comercial",
  sazonal: "Sazonal",
};

export function useCommemorativeDates() {
  const [dates, setDates] = useState<CommemorativeDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("commemorative_dates")
      .select("*")
      .order("date_month")
      .order("date_day");
    setDates((data as CommemorativeDate[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDates();
  }, []);

  const countries = useMemo(() => {
    const map = new Map<string, { code: string; color: string }>();
    dates.forEach((d) => {
      if (!map.has(d.country)) {
        map.set(d.country, { code: d.country_code, color: d.country_color });
      }
    });
    return Array.from(map.entries()).map(([name, info]) => ({
      name,
      code: info.code,
      color: info.color,
    }));
  }, [dates]);

  const filteredDates = useMemo(() => {
    let result = dates;
    if (selectedCountries.length > 0) {
      result = result.filter((d) => selectedCountries.includes(d.country));
    }
    if (selectedCategory !== "all") {
      result = result.filter((d) => d.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.country.toLowerCase().includes(q)
      );
    }
    return result;
  }, [dates, selectedCountries, selectedCategory, searchQuery]);

  const upcomingDates = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const sorted = [...filteredDates].sort((a, b) => {
      const aDaysAhead =
        a.date_month > currentMonth ||
        (a.date_month === currentMonth && a.date_day >= currentDay)
          ? (a.date_month - currentMonth) * 30 + (a.date_day - currentDay)
          : (12 - currentMonth + a.date_month) * 30 + a.date_day;
      const bDaysAhead =
        b.date_month > currentMonth ||
        (b.date_month === currentMonth && b.date_day >= currentDay)
          ? (b.date_month - currentMonth) * 30 + (b.date_day - currentDay)
          : (12 - currentMonth + b.date_month) * 30 + b.date_day;
      return aDaysAhead - bDaysAhead;
    });

    return sorted;
  }, [filteredDates]);

  const nextWeekDates = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const today = new Date(year, now.getMonth(), now.getDate());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return filteredDates.filter((d) => {
      const dateThisYear = new Date(year, d.date_month - 1, d.date_day);
      return dateThisYear >= today && dateThisYear <= weekEnd;
    }).sort((a, b) => {
      if (a.date_month !== b.date_month) return a.date_month - b.date_month;
      return a.date_day - b.date_day;
    });
  }, [filteredDates]);

  const getDatesByMonthDay = (month: number, day: number) => {
    return filteredDates.filter(
      (d) => d.date_month === month && d.date_day === day
    );
  };

  const toggleCountry = (country: string) => {
    setSelectedCountries((prev) =>
      prev.includes(country)
        ? prev.filter((c) => c !== country)
        : [...prev, country]
    );
  };

  return {
    dates,
    filteredDates,
    upcomingDates,
    nextWeekDates,
    countries,
    loading,
    selectedCountries,
    selectedCategory,
    searchQuery,
    setSelectedCountries,
    setSelectedCategory,
    setSearchQuery,
    toggleCountry,
    getDatesByMonthDay,
    refetch: fetchDates,
  };
}
