import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useCalendarPosts, CalendarPost, STATUS_CONFIG } from "@/hooks/useCalendarPosts";
import { CalendarPostDialog } from "@/components/calendar/CalendarPostDialog";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Plus, Check, Clock } from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isToday, isSameMonth
} from "date-fns";
import { ptBR } from "date-fns/locale";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Props {
  clientId: string;
  clientName: string;
}

export function ClientCalendarWidget({ clientId, clientName }: Props) {
  const { posts, createPost, updatePost, deletePost } = useCalendarPosts();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CalendarPost | null>(null);
  const [defaultDate, setDefaultDate] = useState("");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const clientPosts = useMemo(() => posts.filter(p => p.client_id === clientId), [posts, clientId]);

  const postsByDate = useMemo(() => {
    const map: Record<string, CalendarPost[]> = {};
    clientPosts.forEach(p => {
      if (!map[p.publish_date]) map[p.publish_date] = [];
      map[p.publish_date].push(p);
    });
    return map;
  }, [clientPosts]);

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

  const selectedDayPosts = selectedDay ? (postsByDate[selectedDay] || []) : [];

  return (
    <div className="space-y-4 text-zinc-950">{/* Force dark text for modal readability */}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(prev => subMonths(prev, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold capitalize text-zinc-950">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(prev => addMonths(prev, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button size="sm" onClick={() => openCreate()}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo Post
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-zinc-300 rounded-lg overflow-hidden">
        {WEEKDAYS.map(d => (
          <div key={d} className="bg-zinc-100 px-1 py-2 text-center text-xs font-semibold text-zinc-600">
            {d}
          </div>
        ))}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-card min-h-[80px]" />
        ))}
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDate[key] || [];
          const today = isToday(day);
          const isSelected = selectedDay === key;
          return (
            <div
              key={key}
              onClick={() => setSelectedDay(isSelected ? null : key)}
              className={`bg-card min-h-[80px] p-1 cursor-pointer hover:bg-muted/30 transition-colors ${today ? "ring-2 ring-inset ring-primary/40" : ""} ${isSelected ? "bg-accent/20" : ""}`}
            >
              <span className={`text-xs font-medium ${today ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : "text-foreground"}`}>
                {format(day, "d")}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayPosts.slice(0, 3).map(post => {
                  const cfg = STATUS_CONFIG[post.status];
                  return (
                    <button
                      key={post.id}
                      onClick={(e) => { e.stopPropagation(); openEdit(post); }}
                      className={`w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight truncate border-l-2 ${cfg.bgClass} ${cfg.borderClass} hover:opacity-80 transition-opacity`}
                    >
                      <span className="font-medium">{post.publish_time?.slice(0, 5)}</span>{" "}
                      <span className="truncate">{post.title}</span>
                    </button>
                  );
                })}
                {dayPosts.length > 3 && (
                  <span className="text-[10px] text-muted-foreground pl-1">+{dayPosts.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">
              {format(new Date(selectedDay + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h4>
            <Button size="sm" variant="outline" onClick={() => openCreate(selectedDay)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
          {selectedDayPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum post agendado para este dia.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayPosts.map(post => {
                const cfg = STATUS_CONFIG[post.status];
                return (
                  <div
                    key={post.id}
                    onClick={() => openEdit(post)}
                    className={`rounded-lg border-l-4 p-3 cursor-pointer hover:shadow-md transition-shadow ${cfg.bgClass} ${cfg.borderClass}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm font-semibold">{post.publish_time?.slice(0, 5)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${cfg.dotClass} text-white font-medium`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="font-medium text-sm truncate">{post.title}</p>
                        {post.caption && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{post.caption}</p>}
                      </div>
                      {post.media_urls?.[0] && (
                        <img src={post.media_urls[0]} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                      )}
                    </div>
                    {post.status !== "published" && (
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={(e) => { e.stopPropagation(); handleMarkPublished(post); }}>
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
  );
}
