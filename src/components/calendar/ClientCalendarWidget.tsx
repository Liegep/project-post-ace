import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCalendarPosts, CalendarPost, STATUS_CONFIG } from "@/hooks/useCalendarPosts";
import { CalendarPostDialog } from "@/components/calendar/CalendarPostDialog";
import { EventColorPicker, PRESET_COLORS } from "@/components/calendar/EventColorPicker";
import { useCalendarLegend, LegendEntry } from "@/hooks/useCalendarLegend";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Plus, Check, Clock, Kanban, Palette, Trash2, Pencil } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
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
  column_id?: string | null;
  client_label?: string | null;
}

interface KanbanColumn {
  id: string;
  name: string;
  color?: string | null;
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
  columnName?: string | null;
  columnColor?: string | null;
  calendarPost?: CalendarPost;
  kanbanPost?: KanbanPost;
}

interface Props {
  clientId: string;
  clientName: string;
}

export function ClientCalendarWidget({ clientId, clientName }: Props) {
  const { posts: calendarPosts, createPost, updatePost, deletePost } = useCalendarPosts();
  const { legend, setLegend } = useCalendarLegend(clientId);
  const [kanbanPosts, setKanbanPosts] = useState<KanbanPost[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CalendarPost | null>(null);
  const [defaultDate, setDefaultDate] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [kanbanColumns, setKanbanColumns] = useState<KanbanColumn[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // Fetch kanban posts with deadlines for this client
  const fetchKanbanPosts = async () => {
    const { data } = await (supabase
      .from("posts") as any)
      .select("id, title, caption, deadline, media_urls, tags, status, archived, event_color, column_id, client_label")
      .eq("client_id", clientId)
      .not("deadline", "is", null);
    setKanbanPosts((data as KanbanPost[]) || []);
  };

  const fetchColumns = async () => {
    const { data } = await (supabase
      .from("columns") as any)
      .select("id, name, color")
      .eq("client_id", clientId);
    setKanbanColumns((data as KanbanColumn[]) || []);
  };

  useEffect(() => {
    fetchKanbanPosts();
    fetchColumns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const updateKanbanColor = async (id: string, color: string | null) => {
    setKanbanPosts((prev) => prev.map((p) => (p.id === id ? { ...p, event_color: color } : p)));
    await (supabase.from("posts") as any).update({ event_color: color }).eq("id", id);
  };

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
        color: p.event_color ?? null,
        calendarPost: p,
      });
    });

    const colByCol = new Map(kanbanColumns.map((c) => [c.id, c]));
    kanbanPosts.forEach((p) => {
      if (!p.deadline) return;
      const deadlineDate = p.deadline.slice(0, 10); // "yyyy-MM-dd"
      const col = p.column_id ? colByCol.get(p.column_id) : undefined;
      const fallback = col?.color || null;
      list.push({
        id: p.id,
        title: p.title,
        caption: p.caption,
        date: deadlineDate,
        media_urls: p.media_urls || [],
        source: "kanban",
        status: p.archived ? "archived" : "kanban",
        color: p.event_color ?? fallback,
        columnName: col?.name || null,
        columnColor: col?.color || null,
        kanbanPost: p,
      });
    });

    return list;
  }, [clientCalendarPosts, kanbanPosts, kanbanColumns]);

  const FILTER_OPTIONS: { key: string; label: string; color: string }[] = [
    { key: "aprovado", label: "Aprovado", color: "#22c55e" },
    { key: "alteracao_solicitada", label: "Alteração Solicitada", color: "#ef4444" },
    { key: "leia_comentario", label: "Leia Comentário", color: "#f59e0b" },
  ];

  const filteredUnifiedPosts = useMemo(() => {
    if (activeFilters.size === 0) return unifiedPosts;
    return unifiedPosts.filter((p) => {
      if (p.source !== "kanban") return false;
      return activeFilters.has(p.kanbanPost?.client_label || "");
    });
  }, [unifiedPosts, activeFilters]);

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
    if (post.color) return "";
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

  // Compute readable text color (black/white) for a given hex background
  // using WCAG relative luminance.
  const getReadableTextColor = (hex?: string | null): string => {
    if (!hex) return "#0a0a0a";
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return "#0a0a0a";
    const toLin = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const L = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
    // Contrast ratio vs white and black; pick the one with higher contrast
    const contrastWhite = 1.05 / (L + 0.05);
    const contrastBlack = (L + 0.05) / 0.05;
    return contrastWhite > contrastBlack ? "#ffffff" : "#0a0a0a";
  };

  const getPostStyle = (post: UnifiedPost): React.CSSProperties | undefined => {
    if (!post.color) return undefined;
    return {
      backgroundColor: post.color,
      borderLeftColor: post.color,
      color: getReadableTextColor(post.color),
    };
  };

  const getStatusLabel = (post: UnifiedPost) => {
    if (post.source === "kanban") return post.status === "archived" ? "Arquivado" : "Kanban";
    return STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG]?.label || post.status;
  };

  const getStatusDot = (post: UnifiedPost) => {
    if (post.source === "kanban") return post.status === "archived" ? "bg-zinc-400" : "bg-orange-500";
    return STATUS_CONFIG[post.status as keyof typeof STATUS_CONFIG]?.dotClass || "bg-gray-400";
  };

  const ensureLegendColor = (color: string | null, suggestedLabel?: string | null) => {
    if (!color) return;
    if (legend.some((l) => l.color.toLowerCase() === color.toLowerCase())) return;
    setLegend([...legend, { color, label: suggestedLabel || "Nova categoria" }]);
  };

  const changePostColor = async (post: UnifiedPost, color: string | null) => {
    if (post.source === "calendar" && post.calendarPost) {
      await updatePost(post.calendarPost.id, { event_color: color } as any);
    } else if (post.source === "kanban" && post.kanbanPost) {
      await updateKanbanColor(post.kanbanPost.id, color);
    }
    ensureLegendColor(color, post.columnName);
  };

  const addLegendEntry = () => {
    const usedColors = new Set(legend.map((l) => l.color));
    const nextColor = PRESET_COLORS.find((c) => !usedColors.has(c)) || PRESET_COLORS[0];
    setLegend([...legend, { color: nextColor, label: "Nova categoria" }]);
  };
  const updateLegendEntry = (idx: number, patch: Partial<LegendEntry>) => {
    setLegend(legend.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };
  const removeLegendEntry = (idx: number) => {
    setLegend(legend.filter((_, i) => i !== idx));
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


        {/* Legend */}
        <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-3">
          {/* Kanban columns auto legend */}
          {kanbanColumns.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 mb-2">
                <Kanban className="h-3.5 w-3.5" /> Colunas do Kanban
              </div>
              <div className="flex flex-wrap gap-1.5">
                {kanbanColumns.map((col) => (
                  <span
                    key={col.id}
                    className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                    style={{ backgroundColor: "#ffffff", color: "#18181b", borderColor: "#d4d4d8" }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-zinc-400 shrink-0"
                      style={{ backgroundColor: col.color || "#a1a1aa" }}
                    />
                    <span style={{ color: "#18181b" }}>{col.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                <Palette className="h-3.5 w-3.5" /> Legenda de cores
              </div>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={addLegendEntry}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar
              </Button>
            </div>
            {legend.length === 0 ? (
              <p className="text-[11px] text-zinc-500">
                Crie categorias com cor e rótulo para identificar seus eventos (ex.: "Reels", "Story", "Campanha"). Ao mudar a cor de um evento clicando nele, a cor é adicionada aqui automaticamente.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {legend.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 pl-1 pr-1 py-0.5"
                  >
                    <EventColorPicker
                      value={entry.color}
                      onChange={(c) => updateLegendEntry(idx, { color: c || "#3b82f6" })}
                      compact
                    />
                    <Input
                      value={entry.label}
                      onChange={(e) => updateLegendEntry(idx, { label: e.target.value })}
                      className="h-6 w-32 text-[11px] px-1.5 border-0 bg-transparent focus-visible:ring-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeLegendEntry(idx)}
                      className="text-zinc-400 hover:text-destructive p-0.5"
                      title="Remover"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                  {dayPosts.map((post) => (
                    <Popover key={post.id}>
                      <PopoverTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          style={getPostStyle(post)}
                          className={`w-full text-left rounded px-1.5 py-0.5 text-[10px] leading-tight border-l-2 hover:opacity-80 transition-opacity ${getPostColor(post)}`}
                          title={post.title}
                        >
                          <div className="flex items-center gap-1 truncate">
                            {post.source === "kanban" && <Kanban className="inline h-2.5 w-2.5 shrink-0" />}
                            {post.time && <span className="font-bold">{post.time.slice(0, 5)}</span>}
                            <span className="truncate font-semibold">{post.title}</span>
                          </div>
                          {post.columnName && (
                            <div
                              className="flex items-center gap-1 mt-0.5 rounded px-1 py-[1px] w-fit max-w-full"
                              style={{ backgroundColor: "#ffffff" }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full shrink-0 border border-zinc-400"
                                style={{ backgroundColor: post.columnColor || "#a1a1aa" }}
                              />
                              <span className="text-[9px] font-semibold truncate" style={{ color: "#18181b" }}>
                                {post.columnName}
                              </span>
                            </div>
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-64 p-3 z-[9999]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="space-y-2">
                          <div>
                            <p className="font-semibold text-xs text-zinc-900 line-clamp-2">{post.title}</p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              {getStatusLabel(post)}{post.time ? ` • ${post.time.slice(0, 5)}` : ""}
                            </p>
                            {post.columnName && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span
                                  className="h-2.5 w-2.5 rounded-full border border-zinc-300"
                                  style={{ backgroundColor: post.columnColor || "#a1a1aa" }}
                                />
                                <span className="text-[11px] text-zinc-700">{post.columnName}</span>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-zinc-200 pt-2">
                            <div className="text-[11px] font-semibold text-zinc-800 mb-1.5">Cor do evento</div>
                            <div className="grid grid-cols-6 gap-1.5">
                              {PRESET_COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => changePostColor(post, c)}
                                  className={cn(
                                    "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                                    post.color === c ? "border-zinc-900 ring-2 ring-zinc-900/20" : "border-white shadow"
                                  )}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                            {post.color && (
                              <button
                                type="button"
                                onClick={() => changePostColor(post, null)}
                                className="mt-2 w-full inline-flex items-center justify-center gap-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50"
                              >
                                Remover cor
                              </button>
                            )}
                            <p className="text-[10px] text-zinc-500 mt-2">
                              A cor escolhida é adicionada à legenda automaticamente.
                            </p>
                          </div>
                          {post.source === "calendar" && post.calendarPost && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-7 text-[11px]"
                              onClick={() => openEdit(post.calendarPost!)}
                            >
                              <Pencil className="mr-1 h-3 w-3" /> Editar evento
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
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
                      style={getPostStyle(post)}
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
                            <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                              <EventColorPicker
                                value={post.color}
                                onChange={(c) => changePostColor(post, c)}
                                align="end"
                                compact
                              />
                            </div>
                          </div>
                          <p className="font-medium text-sm truncate text-zinc-900">{post.title}</p>
                          {post.columnName && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: post.columnColor || "#a1a1aa" }}
                              />
                              <span className="text-[11px] text-zinc-600">Coluna: {post.columnName}</span>
                            </div>
                          )}
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
