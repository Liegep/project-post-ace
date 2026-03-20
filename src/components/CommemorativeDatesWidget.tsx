import { useState } from "react";
import { useCommemorativeDates, CATEGORY_LABELS } from "@/hooks/useCommemorativeDates";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarHeart, Star, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CreateBriefFromIdeaDialog } from "./CreateBriefFromIdeaDialog";
import type { CommemorativeDate } from "@/hooks/useCommemorativeDates";

const MONTH_NAMES = [
  "", "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function CommemorativeDatesWidget() {
  const {
    nextWeekDates,
    countries,
    loading,
    favoriteCountries,
    toggleFavorite,
  } = useCommemorativeDates();

  const [showFavPicker, setShowFavPicker] = useState(false);
  const [briefDate, setBriefDate] = useState<CommemorativeDate | null>(null);

  if (loading || nextWeekDates.length === 0) return null;

  return (
    <TooltipProvider>
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
          <Popover open={showFavPicker} onOpenChange={setShowFavPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <Star className={cn("h-3 w-3", favoriteCountries.length > 0 ? "fill-amber-400 text-amber-400" : "")} />
                Favoritos
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="end">
              <p className="text-xs font-semibold text-foreground mb-2">Países favoritos</p>
              <p className="text-[10px] text-muted-foreground mb-3">
                O widget prioriza datas dos seus favoritos
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {countries.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => toggleFavorite(c.name)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all border",
                      c.isFavorite
                        ? "border-transparent text-white shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                    style={c.isFavorite ? { backgroundColor: c.color } : undefined}
                  >
                    <Star className={cn("h-2.5 w-2.5", c.isFavorite ? "fill-white" : "")} />
                    {c.name}
                  </button>
                ))}
              </div>
              {favoriteCountries.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  {favoriteCountries.length} país(es) selecionado(s)
                </p>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* List */}
        <div className="divide-y">
          {nextWeekDates.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              {favoriteCountries.length > 0
                ? "Nenhuma data dos seus favoritos nos próximos 7 dias"
                : "Nenhuma data comemorativa nos próximos 7 dias"}
            </div>
          )}
          {nextWeekDates.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-muted shrink-0">
                <span className="text-[10px] font-semibold text-muted-foreground leading-none">
                  {MONTH_NAMES[d.date_month]}
                </span>
                <span className="text-sm font-bold text-foreground leading-tight">
                  {d.date_day}
                </span>
              </div>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setBriefDate(d)}
                  >
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left"><p className="text-xs">Criar pauta</p></TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>

      {briefDate && (
        <CreateBriefFromIdeaDialog
          open={!!briefDate}
          onOpenChange={(open) => { if (!open) setBriefDate(null); }}
          title={briefDate.name}
          description={briefDate.description || `Conteúdo inspirado na data comemorativa: ${briefDate.name} (${briefDate.date_day}/${briefDate.date_month})`}
          plannedDate={new Date(new Date().getFullYear(), briefDate.date_month - 1, briefDate.date_day)}
        />
      )}
    </TooltipProvider>
  );
}
