import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCalendarPosts, CalendarPost, STATUS_CONFIG } from "@/hooks/useCalendarPosts";
import { CalendarPostDialog } from "@/components/calendar/CalendarPostDialog";
import { EventColorPicker, PRESET_COLORS } from "@/components/calendar/EventColorPicker";
import { useCalendarLegend, LegendEntry } from "@/hooks/useCalendarLegend";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Plus, Check, Clock, Kanban, Palette, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface KanbanPost {
  id: string;
  title: string;
  caption: string;
  deadline: string;
  media_urls: string[];
  tags: string[];
  status: string[];
  archived: boolean;
  event_color?: string | null;
}

interface UnifiedPost {
  id: string;
  title: string;
  caption: string;
  date: string;
  time?: string;
  media_urls: string[];
  source: "calendar" | "kanban";
  status: string;
  color?: string | null;
  calendarPost?: CalendarPost;
  kanbanPost?: KanbanPost;
}

interface Props {
  clientId: string;
  clientName: string;
}

export function ClientCalendarWidget({ clientId, clientName }: Props) {
  const { posts: calendarPosts, createPost, updatePost, deletePost } = useCalendarPosts();
  const [kanbanPosts, setKanbanPosts] = useState<KanbanPost[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CalendarPost | null>(null);
  const [defaultDate, setDefaultDate] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Fetch kanban posts with deadlines for this client
  useEffect(() => {
    const fetchKanbanPosts = async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, caption, deadline, media_urls, tags, status, archived")
        .eq("client_id", clientId)
        .not("deadline", "is", null);
      setKanbanPosts((data as KanbanPost[]) || []);
    };
    fetchKanbanPosts();
  }, [clientId]);

  const clientCalendarPosts = useMemo(
    () => calendarPosts.filter((p) => p.client_id === clientId),
    [calendarPosts, clientId]
  );

  // Unify calendar_posts + kanban posts into a single list
  const unifiedPosts = useMemo(() => {
    const list: UnifiedPost[] = [];

    clientCalendarPosts.forEach((p) => {
      list.push({
        id: p.id,
        title: p.title,
        caption: p.caption,
        date: p.publish_date,
        time: p.publish_time,
        media_urls: p.media_urls,
        source: "calendar",
        status: p.status,
        calendarPost: p,
      });
    });

    kanbanPosts.forEach((p) => {
      if (!p.deadline) return;
      const deadlineDate = p.deadline.slice(0, 10); // "yyyy-MM-dd"
      list.push({
        id: p.id,
        title: p.title,
        caption: p.caption,
        date: deadlineDate,
        media_urls: p.media_urls || [],
        source: "kanban",
        status: p.archived ? "archived" : "kanban",
        kanbanPost: p,
      });
    });

    return list;
  }, [clientCalendarPosts, kanbanPosts]);

  const postsByDate = useMemo(() => {
    const map: Record<string, UnifiedPost[]> = {};
    unifiedPosts.forEach((p) => {
      if (!map[p.date]) map[p.date] = [];
      map[p.date].push(p);
    });
    // Sort by time
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => (a.time || "23:59").localeCompare(b.time || "23:59"))
    );
    return map;
  }, [unifiedPosts]);

  const handleSave = async (data: Partial<CalendarPost>) => {
    if ((data as any).id) {
      const { id, ...updates } = data as any;
      return updatePost(id, updates);
    }
    return createPost({ ...data, client_id: clientId });
  };

  const openCreate = (date?: string) => {
    setEditingPost(null);
    setDefaultDate(date || format(new Date(), "yyyy-MM-dd"));
    setDialogOpen(true);
  };

  const openEdit = (post: CalendarPost) => {
    setEditingPost(post);
    setDialogOpen(true);
  };

  const handleMarkPublished = async (post: CalendarPost) => {
    await updatePost(post.id, { status: "published" } as any);
    toast({ title: "Marcado como publicado!" });
  };

  const ms = startOfMonth(currentDate);
  const me = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: ms, end: me });
  const startPad = getDay(ms);

  const selectedDayPosts = selectedDay ? postsByDate[selectedDay] || [] : [];

  const getPostColor = (post: UnifiedPost) => {
    if (post.source === "kanban") {
      return post.status === "archived"
        ? "bg-zinc-200 border-l-zinc-400"
        : "bg-orange-100 border-l-orange-500";
    }
    switch (post.status) {
      case "draft": return "bg-gray-200 border-l-gray-400";
      case "in_review": return "bg-yellow-100 border-l-yellow-500";
      case "approved": return "bg-blue-100 border-l-blue-500";
      case "scheduled": return "bg-purple-100 border-l-purple-500";
      case "published": return "bg-green-100 border-l-green-500";
      default: return "bg-gray-200 border-l-gray-400";
    }
  };

  const getStatusLabel = (post: UnifiedPost) => {
    if (post.source === "kanban") return post.status === "archived" ? "Arquivado" : "Kanban";
    return STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG]?.label || post.status;
  };

  const getStatusDot = (post: UnifiedPost) => {
    if (post.source === "kanban") return post.status === "archived" ? "bg-zinc-400" : "bg-orange-500";
    return STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG]?.dotClass || "bg-gray-400";
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 text-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate((prev) => subMonths(prev, 1))}>
              <ChevronLeft className="h-4 w-4 text-primary-foreground" />
            </Button>
            <h3 className="text-lg font-semibold capitalize text-zinc-950">
              {format(currentDate, "MMMM yyyy", { locale: ptBR })}
            </h3>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate((prev) => addMonths(prev, 1))}>
              <ChevronRight className="h-4 w-4 text-primary-foreground" />
            </Button>
          </div>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo Post
          </Button>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-zinc-300 rounded-lg overflow-hidden">
          {WEEKDAYS.map((d) => (
            <div key={d} className="bg-zinc-100 px-1 py-2 text-center text-xs font-semibold text-zinc-600">
              {d}
            </div>
          ))}
          {Array.from({ length: startPad }).map((_, i) => (
            <div key={`pad-${i}`} className="bg-white min-h-[90px]" />
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayPosts = postsByDate[key] || [];
            const today = isToday(day);
            const isSelected = selectedDay === key;
            return (
              <div
                key={key}
                onClick={() => setSelectedDay(isSelected ? null : key)}
                className={`bg-white min-h-[90px] p-1.5 cursor-pointer hover:bg-zinc-50 transition-colors ${today ? "ring-2 ring-inset ring-primary/40" : ""} ${isSelected ? "bg-blue-50" : ""}`}
              >
                <div className="mb-1">
                  <span
                    className={`text-xs font-bold leading-none inline-flex items-center justify-center ${
                      today
                        ? "bg-primary text-white rounded-full w-6 h-6"
                        : "text-black"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayPosts.slice(0, 3).map((post) => (
                    <Tooltip key={post.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (post.source === "calendar" && post.calendarPost) {
                              openEdit(post.calendarPost);
                            }
                          }}
                          className={`w-full text-left rounded px-1.5 py-0.5 text-[10px] leading-tight truncate border-l-2 hover:opacity-80 transition-opacity ${getPostColor(post)}`}
                        >
                          {post.source === "kanban" && <Kanban className="inline h-2.5 w-2.5 mr-0.5" />}
                          {post.time && <span className="font-bold text-black">{post.time.slice(0, 5)} </span>}
                          <span className="truncate text-black font-semibold">{post.title}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[220px] p-2 z-[9999]" style={{ backgroundColor: 'white', color: '#18181b', border: '1px solid #e4e4e7' }}>
                        <p className="font-semibold text-xs" style={{ color: '#18181b' }}>{post.title}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: '#71717a' }}>
                          {getStatusLabel(post)}{post.time ? ` • ${post.time.slice(0, 5)}` : ""}
                        </p>
                        {post.caption && (
                          <p className="text-[11px] line-clamp-2 mt-1" style={{ color: '#3f3f46' }}>{post.caption}</p>
                        )}
                        {post.media_urls?.[0] && (
                          <img src={post.media_urls[0]} alt="" className="h-12 w-full rounded object-cover mt-1.5" />
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {dayPosts.length > 3 && (
                    <span className="text-[10px] text-zinc-500 pl-1">+{dayPosts.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-zinc-900">
                {format(new Date(selectedDay + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h4>
              <Button size="sm" variant="outline" onClick={() => openCreate(selectedDay)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
            {selectedDayPosts.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhum post agendado para este dia.</p>
            ) : (
              <div className="space-y-2">
                {selectedDayPosts.map((post) => {
                  const isCalendar = post.source === "calendar";
                  return (
                    <div
                      key={post.id}
                      onClick={() => {
                        if (isCalendar && post.calendarPost) openEdit(post.calendarPost);
                      }}
                      className={`rounded-lg border-l-4 p-3 ${isCalendar ? "cursor-pointer hover:shadow-md" : ""} transition-shadow ${getPostColor(post)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {post.source === "kanban" ? (
                              <Kanban className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            )}
                            {post.time && (
                              <span className="text-sm font-semibold text-zinc-900">{post.time.slice(0, 5)}</span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusDot(post)} text-white font-medium`}>
                              {getStatusLabel(post)}
                            </span>
                          </div>
                          <p className="font-medium text-sm truncate text-zinc-900">{post.title}</p>
                          {post.caption && <p className="text-xs text-zinc-500 line-clamp-2 mt-1">{post.caption}</p>}
                        </div>
                        {post.media_urls?.[0] && (
                          <img src={post.media_urls[0]} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                        )}
                      </div>
                      {isCalendar && post.calendarPost && post.calendarPost.status !== "published" && (
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkPublished(post.calendarPost!);
                            }}
                          >
                            <Check className="mr-1 h-3 w-3" /> Publicado
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Dialog */}
        <CalendarPostDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          post={editingPost}
          defaultDate={defaultDate}
          defaultClientId={clientId}
          onSave={handleSave}
          onDelete={deletePost}
        />
      </div>
    </TooltipProvider>
  );
}
