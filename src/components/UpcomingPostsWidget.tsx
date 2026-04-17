import { useState, useMemo } from "react";
import { Post } from "@/types/post";
import { format, isAfter, startOfDay, addDays, startOfWeek, endOfWeek, isSameWeek, isSameMonth } from "date-fns";
import { ptBR, it as itLocale, enUS, es as esLocale, sv as svLocale, Locale as DfnsLocale } from "date-fns/locale";
import { CalendarClock, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { getDeadlineUrgency, URGENCY_STYLES } from "@/lib/deadlineColors";
import { cn } from "@/lib/utils";

interface UpcomingPostsWidgetProps {
  posts: Post[];
  locale?: string;
}

type ViewMode = "week" | "month";

const DATE_LOCALES: Record<string, DfnsLocale> = {
  pt: ptBR,
  en: enUS,
  it: itLocale,
  es: esLocale,
  sv: svLocale,
};

const STRINGS: Record<string, {
  title: string;
  week: string;
  month: string;
  thisWeek: string;
  thisMonth: string;
  posted: string;
  dayMonthFormat: string;
}> = {
  pt: { title: "Próximos Posts", week: "Semana", month: "Mês", thisWeek: "esta semana", thisMonth: "este mês", posted: "Postado", dayMonthFormat: "EEEE, dd 'de' MMM" },
  en: { title: "Upcoming Posts", week: "Week", month: "Month", thisWeek: "this week", thisMonth: "this month", posted: "Posted", dayMonthFormat: "EEEE, MMM dd" },
  it: { title: "Prossimi Post", week: "Settimana", month: "Mese", thisWeek: "questa settimana", thisMonth: "questo mese", posted: "Pubblicato", dayMonthFormat: "EEEE, dd MMM" },
  es: { title: "Próximas Publicaciones", week: "Semana", month: "Mes", thisWeek: "esta semana", thisMonth: "este mes", posted: "Publicado", dayMonthFormat: "EEEE, dd 'de' MMM" },
  sv: { title: "Kommande Inlägg", week: "Vecka", month: "Månad", thisWeek: "denna vecka", thisMonth: "denna månad", posted: "Publicerat", dayMonthFormat: "EEEE, dd MMM" },
};

export const UpcomingPostsWidget = ({ posts, locale = "pt" }: UpcomingPostsWidgetProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const t = STRINGS[locale] ?? STRINGS.pt;
  const dfnsLocale = DATE_LOCALES[locale] ?? ptBR;

  const scheduledPosts = useMemo(() => {
    return posts
      .filter((p) => p.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  }, [posts]);

  const now = new Date();
  // Considera "Postado" apenas a partir das 00:00 do dia seguinte ao prazo
  const isPosted = (deadline: Date) => isAfter(now, startOfDay(addDays(deadline, 1)));

  const groupedPosts = useMemo(() => {
    const groups: { label: string; posts: Post[] }[] = [];
    const groupMap = new Map<string, Post[]>();

    scheduledPosts.forEach((post) => {
      const date = new Date(post.deadline!);
      let key: string;

      if (viewMode === "week") {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        key = `${format(weekStart, "dd/MM", { locale: dfnsLocale })} - ${format(weekEnd, "dd/MM", { locale: dfnsLocale })}`;
        if (isSameWeek(date, now, { weekStartsOn: 1 })) {
          key = `📍 ${key} (${t.thisWeek})`;
        }
      } else {
        key = format(date, "MMMM yyyy", { locale: dfnsLocale });
        if (isSameMonth(date, now)) {
          key = `📍 ${key} (${t.thisMonth})`;
        }
      }

      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(post);
    });

    groupMap.forEach((posts, label) => {
      groups.push({ label, posts });
    });

    return groups;
  }, [scheduledPosts, viewMode, dfnsLocale, t]);

  if (scheduledPosts.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">{t.title}</h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {scheduledPosts.length}
          </span>
        </div>
        <div className="flex rounded-lg border bg-muted p-0.5">
          <button
            onClick={() => setViewMode("week")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${viewMode === "week" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t.week}
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${viewMode === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {t.month}
          </button>
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
        {groupedPosts.map(({ label, posts: groupPosts }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 capitalize">
              {label}
            </p>
            <div className="space-y-2">
              {groupPosts.map((post) => {
                const deadline = new Date(post.deadline!);
                const posted = isPosted(deadline);
                const urgency = getDeadlineUrgency(deadline);
                const urgencyStyle = URGENCY_STYLES[urgency];

                return (
                  <div
                    key={post.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                      posted
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : cn(urgencyStyle.bg, urgencyStyle.border, "hover:opacity-80")
                    )}
                  >
                    {!posted && (
                      <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", urgencyStyle.dot)} />
                    )}

                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt=""
                        className="h-10 w-10 rounded-md object-cover shrink-0"
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${posted ? "text-muted-foreground" : "text-foreground"}`}>
                        {post.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(deadline, t.dayMonthFormat, { locale: dfnsLocale })}
                      </p>
                    </div>

                    {posted ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t.posted}
                      </span>
                    ) : (
                      <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0", urgencyStyle.bg, urgencyStyle.text)}>
                        {urgency === "overdue" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        {format(deadline, "dd/MM")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
