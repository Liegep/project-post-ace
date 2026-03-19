import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCalendarPosts, CalendarPost, CalendarPostStatus, STATUS_CONFIG } from "@/hooks/useCalendarPosts";
import { CalendarPostDialog } from "@/components/calendar/CalendarPostDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Check, Clock,
  CalendarDays, LayoutGrid, List, Columns3
} from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfWeek, endOfWeek, isSameDay, isSameMonth, isToday
} from "date-fns";
import { ptBR } from "date-fns/locale";

type ViewMode = "month" | "week" | "day";

interface Client {
  id: string;
  name: string;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarPage() {
  const navigate = useNavigate();
  const { posts, loading, createPost, updatePost, deletePost } = useCalendarPosts();
  const [clients, setClients] = useState<Client[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterClient, setFilterClient] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CalendarPost | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");
  const [detailPost, setDetailPost] = useState<CalendarPost | null>(null);

  useEffect(() => {
    supabase.from("clients").select("id, name").order("name").then(({ data }) => {
      setClients((data as Client[]) || []);
    });
  }, []);

  const filteredPosts = useMemo(() => {
    let filtered = posts;
    if (filterClient !== "all") filtered = filtered.filter((p) => p.client_id === filterClient);
    if (filterStatus !== "all") filtered = filtered.filter((p) => p.status === filterStatus);
    return filtered;
  }, [posts, filterClient, filterStatus]);

  const postsByDate = useMemo(() => {
    const map: Record<string, CalendarPost[]> = {};
    filteredPosts.forEach((p) => {
      const key = p.publish_date;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [filteredPosts]);

  const goToToday = () => setCurrentDate(new Date());

  const navigate_date = (dir: "prev" | "next") => {
    const fn = dir === "prev"
      ? viewMode === "month" ? subMonths : viewMode === "week" ? subWeeks : subDays
      : viewMode === "month" ? addMonths : viewMode === "week" ? addWeeks : addDays;
    setCurrentDate(fn(currentDate, 1));
  };

  const headerLabel = useMemo(() => {
    if (viewMode === "month") return format(currentDate, "MMMM yyyy", { locale: ptBR });
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(ws, "d MMM", { locale: ptBR })} — ${format(we, "d MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
  }, [currentDate, viewMode]);

  const handleSave = async (data: Partial<CalendarPost>) => {
    if ((data as any).id) {
      const { id, ...updates } = data as any;
      return updatePost(id, updates);
    }
    return createPost(data);
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

  const handleSchedule = async (post: CalendarPost) => {
    await updatePost(post.id, { status: "scheduled" } as any);
    toast({ title: "Post agendado!" });
  };

  // --- Post block component ---
  const PostBlock = ({ post, compact = false }: { post: CalendarPost; compact?: boolean }) => {
    const cfg = STATUS_CONFIG[post.status];
    const clientName = post.clients?.name || clients.find((c) => c.id === post.client_id)?.name || "";
    const time = post.publish_time?.slice(0, 5) || "";

    if (compact) {
      return (
        <button
          onClick={() => openEdit(post)}
          className={`w-full text-left rounded px-1.5 py-0.5 text-[11px] leading-tight truncate border-l-2 ${cfg.bgClass} ${cfg.borderClass} hover:opacity-80 transition-opacity`}
        >
          <span className="font-medium">{time}</span>{" "}
          <span className="text-muted-foreground">{clientName}</span>{" "}
          <span className="truncate">{post.title}</span>
        </button>
      );
    }

    return (
      <div
        onClick={() => setDetailPost(post)}
        className={`rounded-lg border-l-4 p-3 cursor-pointer hover:shadow-md transition-shadow ${cfg.bgClass} ${cfg.borderClass}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold">{time}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.dotClass} text-white font-medium`}>
                {cfg.label}
              </span>
            </div>
            <p className="font-medium text-sm truncate">{post.title}</p>
            <p className="text-xs text-muted-foreground truncate">{clientName}</p>
          </div>
          {post.media_urls?.[0] && (
            <img src={post.media_urls[0]} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
          )}
        </div>
        <div className="flex gap-1 mt-2">
          {post.status !== "published" && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={(e) => { e.stopPropagation(); handleMarkPublished(post); }}>
              <Check className="mr-1 h-3 w-3" /> Publicado
            </Button>
          )}
          {post.status === "approved" && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={(e) => { e.stopPropagation(); handleSchedule(post); }}>
              Agendar
            </Button>
          )}
        </div>
      </div>
    );
  };

  // --- MONTH VIEW ---
  const MonthView = () => {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: ms, end: me });
    const startPad = getDay(ms);

    return (
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-muted px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-card min-h-[110px]" />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDate[key] || [];
          const today = isToday(day);
          return (
            <div
              key={key}
              className={`bg-card min-h-[110px] p-1.5 cursor-pointer hover:bg-muted/30 transition-colors ${today ? "ring-2 ring-inset ring-primary/40" : ""}`}
              onClick={() => { setCurrentDate(day); setViewMode("day"); }}
            >
              <div className={`text-xs font-medium mb-1 flex items-center justify-between ${today ? "text-primary font-bold" : "text-muted-foreground"}`}>
                <span className={today ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-[11px]" : ""}>
                  {format(day, "d")}
                </span>
                {dayPosts.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{dayPosts.length}</span>
                )}
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 3).map((p) => (
                  <PostBlock key={p.id} post={p} compact />
                ))}
                {dayPosts.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center">+{dayPosts.length - 3}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- WEEK VIEW ---
  const WeekView = () => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));

    return (
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-muted">
          <div className="p-2" />
          {weekDays.map((d) => (
            <div
              key={d.toISOString()}
              className={`p-2 text-center border-l cursor-pointer hover:bg-muted/80 ${isToday(d) ? "bg-primary/10" : ""}`}
              onClick={() => { setCurrentDate(d); setViewMode("day"); }}
            >
              <p className="text-xs text-muted-foreground">{format(d, "EEE", { locale: ptBR })}</p>
              <p className={`text-lg font-semibold ${isToday(d) ? "text-primary" : ""}`}>{format(d, "d")}</p>
            </div>
          ))}
        </div>
        {/* Time grid */}
        <div className="max-h-[600px] overflow-y-auto">
          {HOURS.map((h) => (
            <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[48px]">
              <div className="text-[11px] text-muted-foreground text-right pr-2 pt-1 border-t">
                {String(h).padStart(2, "0")}:00
              </div>
              {weekDays.map((d) => {
                const key = format(d, "yyyy-MM-dd");
                const hourPosts = (postsByDate[key] || []).filter((p) => {
                  const pHour = parseInt(p.publish_time?.split(":")[0] || "0", 10);
                  return pHour === h;
                });
                return (
                  <div
                    key={`${key}-${h}`}
                    className="border-l border-t p-0.5 hover:bg-muted/20 cursor-pointer"
                    onClick={() => openCreate(key)}
                  >
                    {hourPosts.map((p) => (
                      <PostBlock key={p.id} post={p} compact />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- DAY VIEW ---
  const DayView = () => {
    const key = format(currentDate, "yyyy-MM-dd");
    const dayPosts = postsByDate[key] || [];
    const sortedPosts = [...dayPosts].sort((a, b) => (a.publish_time || "").localeCompare(b.publish_time || ""));

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold capitalize">
            {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
          <Button size="sm" onClick={() => openCreate(key)}>
            <Plus className="mr-1 h-4 w-4" /> Novo Post
          </Button>
        </div>

        {sortedPosts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum post neste dia</p>
            <Button variant="outline" className="mt-3" onClick={() => openCreate(key)}>
              <Plus className="mr-1 h-4 w-4" /> Criar post
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedPosts.map((p) => (
              <PostBlock key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // --- DETAIL PANEL (side sheet) ---
  const DetailPanel = () => {
    if (!detailPost) return null;
    const cfg = STATUS_CONFIG[detailPost.status];
    const clientName = detailPost.clients?.name || clients.find((c) => c.id === detailPost.client_id)?.name || "";

    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Detalhes do Post</h3>
          <Button variant="ghost" size="icon" onClick={() => setDetailPost(null)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {detailPost.media_urls?.[0] && (
            <div className="rounded-lg overflow-hidden border">
              {detailPost.media_type === "video" ? (
                <video src={detailPost.media_urls[0]} controls className="w-full" />
              ) : (
                <img src={detailPost.media_urls[0]} alt="" className="w-full object-cover max-h-60" />
              )}
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Título</p>
            <p className="font-semibold text-lg">{detailPost.title}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="font-medium">{clientName}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="font-medium">{format(new Date(detailPost.publish_date + "T12:00:00"), "dd/MM/yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Horário</p>
              <p className="font-medium">{detailPost.publish_time?.slice(0, 5)}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.bgClass}`}>
              <span className={`h-2 w-2 rounded-full ${cfg.dotClass}`} />
              {cfg.label}
            </span>
          </div>
          {detailPost.caption && (
            <div>
              <p className="text-xs text-muted-foreground">Legenda</p>
              <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-lg mt-1">{detailPost.caption}</p>
            </div>
          )}
          {detailPost.media_urls?.length > 1 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Mais mídias</p>
              <div className="flex gap-2 flex-wrap">
                {detailPost.media_urls.slice(1).map((url, i) => (
                  <img key={i} src={url} alt="" className="h-16 w-16 rounded object-cover border" />
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => { openEdit(detailPost); setDetailPost(null); }}>
            Editar
          </Button>
          {detailPost.status !== "published" && (
            <Button className="flex-1" onClick={() => { handleMarkPublished(detailPost); setDetailPost(null); }}>
              <Check className="mr-1 h-4 w-4" /> Publicado
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Header */}
      <header className="border-b bg-card px-3 py-2.5 md:px-4 md:py-3 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 md:gap-3">
            <MobileNav title="Calendário" />
            <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CalendarDays className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
            <h1 className="text-sm md:text-lg font-bold text-foreground truncate">Calendário</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Nav */}
            <Button variant="outline" size="sm" onClick={goToToday}>Hoje</Button>
            <Button variant="ghost" size="icon" onClick={() => navigate_date("prev")}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => navigate_date("next")}><ChevronRight className="h-4 w-4" /></Button>
            <span className="text-sm font-semibold capitalize min-w-[140px] text-center">{headerLabel}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex bg-muted rounded-lg p-0.5">
              {([
                { mode: "month" as ViewMode, icon: LayoutGrid, label: "Mês" },
                { mode: "week" as ViewMode, icon: Columns3, label: "Semana" },
                { mode: "day" as ViewMode, icon: List, label: "Dia" },
              ]).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${viewMode === mode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {(Object.keys(STATUS_CONFIG) as CalendarPostStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${STATUS_CONFIG[s].dotClass}`} />
                      {STATUS_CONFIG[s].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button size="sm" onClick={() => openCreate()}>
              <Plus className="mr-1 h-4 w-4" /> Novo Post
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            {viewMode === "month" && <MonthView />}
            {viewMode === "week" && <WeekView />}
            {viewMode === "day" && <DayView />}
          </>
        )}
      </main>

      {/* Detail panel overlay */}
      {detailPost && (
        <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setDetailPost(null)} />
      )}
      <DetailPanel />

      {/* Create/Edit Dialog */}
      <CalendarPostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        post={editingPost}
        onSave={handleSave}
        onDelete={deletePost}
        defaultDate={defaultDate}
      />
    </div>
  );
}
