import { useState } from "react";
import { useCommemorativeDates, CATEGORY_LABELS } from "@/hooks/useCommemorativeDates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarHeart, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function CommemorativeDatesWidget() {
  const {
    nextWeekDates,
    countries,
    loading,
    selectedCountries,
    searchQuery,
    setSearchQuery,
    toggleCountry,
    setSelectedCountries,
  } = useCommemorativeDates();

  const [showFilters, setShowFilters] = useState(false);
  const visible = nextWeekDates;

  if (loading) return null;

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <CalendarHeart className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Datas Comemorativas</h3>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {nextWeekDates.length}
          </Badge>
          <span className="text-[10px] text-muted-foreground">próximos 7 dias</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Search className="h-3 w-3 mr-1" />
          Filtrar
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-4 py-3 border-b bg-muted/30 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar país ou data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs pl-8 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {countries.map((c) => (
              <button
                key={c.name}
                onClick={() => toggleCountry(c.name)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border",
                  selectedCountries.includes(c.name)
                    ? "border-transparent text-white shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:bg-muted"
                )}
                style={
                  selectedCountries.includes(c.name)
                    ? { backgroundColor: c.color }
                    : undefined
                }
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: c.color }}
                />
                {c.name}
              </button>
            ))}
            {selectedCountries.length > 0 && (
              <button
                onClick={() => setSelectedCountries([])}
                className="text-[11px] text-muted-foreground hover:text-foreground underline"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="divide-y">
        {visible.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            Nenhuma data encontrada
          </div>
        )}
        {visible.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
          >
            {/* Date badge */}
            <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-muted shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground leading-none">
                {MONTH_NAMES[d.date_month]}
              </span>
              <span className="text-sm font-bold text-foreground leading-tight">
                {d.date_day}
              </span>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-1.5 py-0.5 text-white"
                  style={{ backgroundColor: d.country_color }}
                >
                  {d.country}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {CATEGORY_LABELS[d.category] || d.category}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expand/collapse */}
    </div>
  );
}
