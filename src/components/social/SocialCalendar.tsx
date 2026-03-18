import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Facebook, Instagram, FileText } from "lucide-react";
import { SocialStatusBadge } from "./SocialStatusBadge";
import type { SocialPost } from "@/hooks/useSocialPosts";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ScheduledKanbanPost {
  id: string;
  title: string;
  client_name: string;
  deadline: string;
}

interface SocialCalendarProps {
  posts: SocialPost[];
  scheduledPosts?: ScheduledKanbanPost[];
  onPostClick: (post: SocialPost) => void;
}

export function SocialCalendar({ posts, onPostClick }: SocialCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start to align with weekday
  const startPad = getDay(monthStart); // 0=Sunday

  const postsByDay = useMemo(() => {
    const map: Record<string, SocialPost[]> = {};
    posts.forEach((p) => {
      const date = p.scheduled_at || p.created_at;
      const key = format(new Date(date), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [posts]);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-lg capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {/* Weekday headers */}
        {weekDays.map((d) => (
          <div key={d} className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}

        {/* Padding cells */}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-card min-h-[100px]" />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDay[key] || [];
          const isToday = isSameDay(day, new Date());

          return (
            <div key={key} className={`bg-card min-h-[100px] p-1.5 ${isToday ? "ring-2 ring-inset ring-primary/30" : ""}`}>
              <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayPosts.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onPostClick(p)}
                    className="w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight truncate hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    {p.platform === "instagram" ? (
                      <Instagram className="h-2.5 w-2.5 text-pink-500 shrink-0" />
                    ) : (
                      <Facebook className="h-2.5 w-2.5 text-blue-600 shrink-0" />
                    )}
                    <span className="truncate">{p.caption.slice(0, 30) || "Sem legenda"}</span>
                  </button>
                ))}
                {dayPosts.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center">+{dayPosts.length - 3} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
