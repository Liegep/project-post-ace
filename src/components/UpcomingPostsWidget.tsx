import { useState, useMemo } from "react";
import { Post } from "@/types/post";
import { format, isAfter, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameWeek, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { getDeadlineUrgency, URGENCY_STYLES } from "@/lib/deadlineColors";
import { cn } from "@/lib/utils";

interface UpcomingPostsWidgetProps {
  posts: Post[];
  locale?: string;
}

type ViewMode = "week" | "month";

export const UpcomingPostsWidget = ({ posts, locale = "pt" }: UpcomingPostsWidgetProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>("week");

  // Posts with deadline only, sorted by date
  const scheduledPosts = useMemo(() => {
    return posts
      .filter((p) => p.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());
  }, [posts]);

  const now = new Date();
  const isPosted = (deadline: Date) => isAfter(now, addDays(deadline, 1));

  // Group posts by week or month
  const groupedPosts = useMemo(() => {
    const groups: { label: string; posts: Post[] }[] = [];
    const groupMap = new Map<string, Post[]>();

    scheduledPosts.forEach((post) => {
      const date = new Date(post.deadline!);
      let key: string;

      if (viewMode === "week") {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        key = `${format(weekStart, "dd/MM", { locale: ptBR })} - ${format(weekEnd, "dd/MM", { locale: ptBR })}`;

        // Add current week indicator
        if (isSameWeek(date, now, { weekStartsOn: 1 })) {
          key = `📍 ${key} (esta semana)`;
        }
      } else {
        key = format(date, "MMMM yyyy", { locale: ptBR });
        if (isSameMonth(date, now)) {
          key = `📍 ${key} (este mês)`;
        }
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(post);
    });

    groupMap.forEach((posts, label) => {
      groups.push({ label, posts });
    });

    return groups;
  }, [scheduledPosts, viewMode]);

  if (scheduledPosts.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">Próximos Posts</h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {scheduledPosts.length}
          </span>
        </div>
        <div className="flex rounded-lg border bg-muted p-0.5">
          <button
            onClick={() => setViewMode("week")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${viewMode === "week" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Semana
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${viewMode === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            Mês
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
                    {/* Urgency dot */}
                    {!posted && (
                      <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", urgencyStyle.dot)} />
                    )}

                    {/* Media thumbnail */}
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
                        {format(deadline, "EEEE, dd 'de' MMM", { locale: ptBR })}
                      </p>
                    </div>

                    {posted ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Postado
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
