import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Facebook, Instagram, FileText, CalendarClock, X } from "lucide-react";
import type { SocialPost } from "@/hooks/useSocialPosts";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ScheduledKanbanPost {
  id: string;
  title: string;
  client_name: string;
  deadline: string;
  preview_url?: string | null;
  preview_text?: string | null;
}

interface SocialCalendarProps {
  posts: SocialPost[];
  scheduledPosts?: ScheduledKanbanPost[];
  onPostClick: (post: SocialPost) => void;
  onReschedule?: (post: SocialPost, newDate: Date) => void;
}

export function SocialCalendar({ posts, scheduledPosts = [], onPostClick, onReschedule }: SocialCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState<SocialPost | null>(null);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

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

  const kanbanByDay = useMemo(() => {
    const map: Record<string, ScheduledKanbanPost[]> = {};
    scheduledPosts.forEach((p) => {
      const key = format(new Date(p.deadline), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [scheduledPosts]);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const handlePostSelect = (post: SocialPost, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPost?.id === post.id) {
      setSelectedPost(null);
    } else {
      setSelectedPost(post);
    }
  };

  const handleDayClick = (day: Date) => {
    if (!selectedPost || !onReschedule) return;
    // Don't reschedule to the same day
    const currentDate = selectedPost.scheduled_at || selectedPost.created_at;
    if (isSameDay(new Date(currentDate), day)) return;
    setTargetDate(day);
    setConfirmOpen(true);
  };

  const confirmReschedule = () => {
    if (selectedPost && targetDate && onReschedule) {
      onReschedule(selectedPost, targetDate);
      setSelectedPost(null);
      setTargetDate(null);
      setConfirmOpen(false);
    }
  };

  const cancelSelection = () => {
    setSelectedPost(null);
    setTargetDate(null);
    setConfirmOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Selection banner */}
      {selectedPost && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <CalendarClock className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground">
            <strong>Reagendar:</strong> clique no dia desejado para mover{" "}
            <em className="text-primary">"{selectedPost.caption?.slice(0, 30) || "Post"}"</em>
          </span>
          <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={cancelSelection}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

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

      <div className="grid grid-cols-7 gap-px bg-border rounded-lg">
        {weekDays.map((d) => (
          <div key={d} className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}

        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-card min-h-[100px]" />
        ))}

        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayPosts = postsByDay[key] || [];
          const dayKanban = kanbanByDay[key] || [];
          const isToday = isSameDay(day, new Date());
          const totalItems = dayPosts.length + dayKanban.length;
          const maxVisible = 3;
          const isDropTarget = !!selectedPost;

          return (
            <div
              key={key}
              onClick={() => handleDayClick(day)}
              className={`bg-card min-h-[100px] p-1.5 transition-colors ${
                isToday ? "ring-2 ring-inset ring-primary/30" : ""
              } ${isDropTarget ? "cursor-pointer hover:bg-primary/5 hover:ring-2 hover:ring-inset hover:ring-primary/20" : ""}`}
            >
              <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayKanban.slice(0, maxVisible).map((p) => (
                  <Tooltip key={`kanban-${p.id}`}>
                    <TooltipTrigger asChild>
                      <div className="w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight truncate flex items-center gap-1 bg-accent/50 border border-accent cursor-default">
                        <FileText className="h-2.5 w-2.5 text-primary shrink-0" />
                        <span className="truncate font-medium">{p.title}</span>
                        <span className="text-muted-foreground shrink-0">· {p.client_name}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="start" className="w-56 p-2 space-y-2">
                      {p.preview_url ? (
                        <img src={p.preview_url} alt="Prévia do post" className="w-full aspect-square rounded-md object-cover" />
                      ) : (
                        <div className="w-full aspect-square rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          Sem imagem
                        </div>
                      )}
                      {p.preview_text && <p className="text-xs text-foreground line-clamp-3">{p.preview_text}</p>}
                    </TooltipContent>
                  </Tooltip>
                ))}

                {dayPosts.slice(0, Math.max(0, maxVisible - dayKanban.length)).map((p) => {
                  const previewUrl = p.media_urls?.[0] || null;
                  const isSelected = selectedPost?.id === p.id;

                  return (
                    <Tooltip key={p.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            if (onReschedule) {
                              handlePostSelect(p, e);
                            } else {
                              onPostClick(p);
                            }
                          }}
                          onDoubleClick={() => onPostClick(p)}
                          className={`w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight truncate transition-colors flex items-center gap-1 ${
                            isSelected
                              ? "bg-primary/15 ring-1 ring-primary text-primary"
                              : "hover:bg-muted"
                          }`}
                        >
                          {p.platform === "instagram" ? (
                            <Instagram className="h-2.5 w-2.5 text-pink-500 shrink-0" />
                          ) : (
                            <Facebook className="h-2.5 w-2.5 text-blue-600 shrink-0" />
                          )}
                          <span className="truncate">{p.caption.slice(0, 20) || "Sem legenda"}</span>
                          {(p as any).clients?.name && (
                            <span className="text-muted-foreground shrink-0">· {(p as any).clients.name}</span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="start" className="w-56 p-2 space-y-2">
                        {previewUrl ? (
                          <img src={previewUrl} alt="Prévia do post" className="w-full aspect-square rounded-md object-cover" />
                        ) : (
                          <div className="w-full aspect-square rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            Sem imagem
                          </div>
                        )}
                        {p.caption && <p className="text-xs text-foreground line-clamp-3">{p.caption}</p>}
                        {onReschedule && (
                          <p className="text-[10px] text-muted-foreground italic">
                            Clique para selecionar • Duplo-clique para editar
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}

                {totalItems > maxVisible && (
                  <p className="text-[10px] text-muted-foreground text-center">+{totalItems - maxVisible} mais</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm reschedule dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Reagendar post
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Mover o post para <strong className="text-foreground">{targetDate ? format(targetDate, "dd 'de' MMMM", { locale: ptBR }) : ""}</strong>?
            </p>
            {selectedPost && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  {selectedPost.platform === "instagram" ? (
                    <Instagram className="h-4 w-4 text-pink-500" />
                  ) : (
                    <Facebook className="h-4 w-4 text-blue-600" />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">
                    {selectedPost.caption?.slice(0, 50) || "Sem legenda"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Atualmente em: {format(new Date(selectedPost.scheduled_at || selectedPost.created_at), "dd/MM/yyyy")}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelSelection}>Cancelar</Button>
            <Button onClick={confirmReschedule}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
