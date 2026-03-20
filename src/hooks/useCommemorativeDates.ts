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
  const [favoriteCountries, setFavoriteCountries] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);

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

  const fetchFavorites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("user_favorite_countries")
      .select("country")
      .eq("user_id", user.id);
    const favs = (data || []).map((f: any) => f.country);
    setFavoriteCountries(favs);
    setFavoritesLoaded(true);
  };

  const toggleFavorite = async (country: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (favoriteCountries.includes(country)) {
      await supabase
        .from("user_favorite_countries")
        .delete()
        .eq("user_id", user.id)
        .eq("country", country);
      setFavoriteCountries((prev) => prev.filter((c) => c !== country));
    } else {
      await supabase
        .from("user_favorite_countries")
        .insert({ user_id: user.id, country });
      setFavoriteCountries((prev) => [...prev, country]);
    }
  };

  useEffect(() => {
    fetchDates();
    fetchFavorites();
  }, []);

  const countries = useMemo(() => {
    const map = new Map<string, { code: string; color: string }>();
    dates.forEach((d) => {
      if (!map.has(d.country)) {
        map.set(d.country, { code: d.country_code, color: d.country_color });
      }
    });
    const list = Array.from(map.entries()).map(([name, info]) => ({
      name,
      code: info.code,
      color: info.color,
      isFavorite: favoriteCountries.includes(name),
    }));
    // Sort: favorites first
    list.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [dates, favoriteCountries]);

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

  // For the widget: show only favorites if set, otherwise all
  const widgetDates = useMemo(() => {
    if (favoriteCountries.length > 0) {
      return dates.filter((d) => favoriteCountries.includes(d.country));
    }
    return dates;
  }, [dates, favoriteCountries]);

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

    return widgetDates.filter((d) => {
      const dateThisYear = new Date(year, d.date_month - 1, d.date_day);
      return dateThisYear >= today && dateThisYear <= weekEnd;
    }).sort((a, b) => {
      if (a.date_month !== b.date_month) return a.date_month - b.date_month;
      return a.date_day - b.date_day;
    });
  }, [widgetDates]);

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
    favoriteCountries,
    setSelectedCountries,
    setSelectedCategory,
    setSearchQuery,
    toggleCountry,
    toggleFavorite,
    getDatesByMonthDay,
    refetch: fetchDates,
  };
}
