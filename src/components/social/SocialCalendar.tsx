import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Facebook, Instagram, FileText, CalendarClock, X } from "lucide-react";

interface ClientLegend {
  id: string;
  name: string;
}
import type { SocialPost } from "@/hooks/useSocialPosts";
import { getClientColor } from "@/lib/clientColors";
import { useClientColors } from "@/hooks/useClientColors";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ScheduledKanbanPost {
  id: string;
  title: string;
  client_name: string;
  client_id: string;
  deadline: string;
  preview_url?: string | null;
  preview_text?: string | null;
}

type SelectedItem =
  | { type: "social"; post: SocialPost }
  | { type: "kanban"; post: ScheduledKanbanPost };

interface SocialCalendarProps {
  posts: SocialPost[];
  scheduledPosts?: ScheduledKanbanPost[];
  onPostClick: (post: SocialPost) => void;
  onReschedule?: (post: SocialPost, newDate: Date) => void;
  onRescheduleKanban?: (postId: string, newDate: Date) => void;
}

export function SocialCalendar({ posts, scheduledPosts = [], onPostClick, onReschedule, onRescheduleKanban }: SocialCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { colors: clientColorOverrides, setColor: setClientColor } = useClientColors();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPad = getDay(monthStart);

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

  const canReschedule = !!(onReschedule || onRescheduleKanban);

  const clientsLegend = useMemo<ClientLegend[]>(() => {
    const map = new Map<string, string>();
    posts.forEach((p) => {
      const id = p.client_id;
      const name = (p as any).clients?.name || "";
      if (id && name) map.set(id, name);
    });
    scheduledPosts.forEach((p) => {
      if (p.client_id && p.client_name) map.set(p.client_id, p.client_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [posts, scheduledPosts]);

  const handleKanbanSelect = (post: ScheduledKanbanPost, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedItem?.type === "kanban" && selectedItem.post.id === post.id) {
      setSelectedItem(null);
    } else {
      setSelectedItem({ type: "kanban", post });
    }
  };

  const handleSocialSelect = (post: SocialPost, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedItem?.type === "social" && selectedItem.post.id === post.id) {
      setSelectedItem(null);
    } else {
      setSelectedItem({ type: "social", post });
    }
  };

  const getSelectedDate = (): string => {
    if (!selectedItem) return "";
    if (selectedItem.type === "social") {
      return selectedItem.post.scheduled_at || selectedItem.post.created_at;
    }
    return selectedItem.post.deadline;
  };

  const getSelectedLabel = (): string => {
    if (!selectedItem) return "";
    if (selectedItem.type === "social") {
      return selectedItem.post.caption?.slice(0, 30) || "Post";
    }
    return selectedItem.post.title || "Post";
  };

  const handleDayClick = (day: Date) => {
    if (!selectedItem || !canReschedule) return;
    const currentDate = getSelectedDate();
    if (isSameDay(new Date(currentDate), day)) return;
    setTargetDate(day);
    setConfirmOpen(true);
  };

  const confirmReschedule = () => {
    if (!selectedItem || !targetDate) return;
    if (selectedItem.type === "social" && onReschedule) {
      onReschedule(selectedItem.post, targetDate);
    } else if (selectedItem.type === "kanban" && onRescheduleKanban) {
      onRescheduleKanban(selectedItem.post.id, targetDate);
    }
    setSelectedItem(null);
    setTargetDate(null);
    setConfirmOpen(false);
  };

  const cancelSelection = () => {
    setSelectedItem(null);
    setTargetDate(null);
    setConfirmOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Selection banner */}
      {selectedItem && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <CalendarClock className="h-4 w-4 text-primary shrink-0" />
          <span className="text-foreground">
            <strong>Reagendar:</strong> clique no dia desejado para mover{" "}
            <em className="text-primary">"{getSelectedLabel()}"</em>
          </span>
          <Button variant="ghost" size="icon" className="ml-auto h-6 w-6" onClick={cancelSelection}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1 bg-card rounded-md p-1 border border-border">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4 text-foreground" />
          </Button>
          <h3 className="font-semibold text-lg capitalize text-center min-w-[160px] text-foreground">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            aria-label="Próximo"
          >
            <ChevronRight className="h-4 w-4 text-foreground" />
          </Button>
        </div>
      </div>
      {/* Client legend */}

      {clientsLegend.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center justify-center">
          {clientsLegend.map((client) => {
            const override = clientColorOverrides[client.id] ?? null;
            const color = getClientColor(client.id, override);
            return (
              <Popover key={client.id}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium hover:opacity-90 transition-opacity cursor-pointer"
                    style={{
                      background: color.bg,
                      borderColor: color.border,
                      color: color.text,
                    }}
                    title="Clique para personalizar a cor"
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color.text }}
                    />
                    {client.name}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3 space-y-3" align="center">
                  <div className="text-xs font-medium text-foreground">{client.name}</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={override || color.hex}
                      onChange={(e) => setClientColor(client.id, e.target.value)}
                      className="h-9 w-12 rounded border border-border bg-transparent cursor-pointer"
                      aria-label={`Cor de ${client.name}`}
                    />
                    <div className="flex-1 text-[11px] text-muted-foreground">
                      Selecione uma cor para este cliente no calendário.
                    </div>
                  </div>
                  {override && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs h-7"
                      onClick={() => setClientColor(client.id, null)}
                    >
                      Restaurar cor padrão
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      )}

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
          const isDropTarget = !!selectedItem;

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
                {dayKanban.slice(0, maxVisible).map((p) => {
                  const isSelected = selectedItem?.type === "kanban" && selectedItem.post.id === p.id;
                  const color = getClientColor(p.client_id, clientColorOverrides[p.client_id] ?? null);

                  return (
                    <Tooltip key={`kanban-${p.id}`}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            if (onRescheduleKanban) {
                              handleKanbanSelect(p, e);
                            }
                          }}
                          className={`w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight truncate flex items-center gap-1 transition-colors cursor-pointer ${
                            isSelected ? "ring-1 ring-primary" : ""
                          }`}
                          style={
                            isSelected
                              ? { background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }
                              : { background: color.bg, borderColor: color.border, color: color.text, borderWidth: 1, borderStyle: "solid" }
                          }
                        >
                          <FileText className="h-2.5 w-2.5 shrink-0" style={{ color: isSelected ? undefined : color.text }} />
                          <span className="truncate font-bold">{p.title}</span>
                          <span className="shrink-0">· {p.client_name}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="start" className="w-56 p-2 space-y-2">
                        {p.preview_url ? (
                          <img src={p.preview_url} alt="Prévia do post" className="w-full aspect-square rounded-md object-cover" />
                        ) : (
                          <div className="w-full aspect-square rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            Sem imagem
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium text-foreground">Agendado</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Deadline:</span>
                            <span className="font-medium text-foreground">{format(new Date(p.deadline), "dd/MM/yyyy")}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Cliente:</span>
                            <span className="font-medium text-foreground">{p.client_name}</span>
                          </div>
                        </div>
                        {p.preview_text && <p className="text-xs text-foreground line-clamp-3">{p.preview_text}</p>}
                        {onRescheduleKanban && (
                          <p className="text-[10px] text-muted-foreground italic">
                            Clique para selecionar e reagendar
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}

                {dayPosts.slice(0, Math.max(0, maxVisible - dayKanban.length)).map((p) => {
                  const previewUrl = p.media_urls?.[0] || null;
                  const isSelected = selectedItem?.type === "social" && selectedItem.post.id === p.id;
                  const isPublished = p.status === "published";
                  const color = getClientColor(p.client_id);

                  return (
                    <Tooltip key={p.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            if (onReschedule) {
                              handleSocialSelect(p, e);
                            } else {
                              onPostClick(p);
                            }
                          }}
                          onDoubleClick={() => onPostClick(p)}
                          className={`w-full text-left rounded px-1 py-0.5 text-[10px] leading-tight truncate transition-colors flex items-center gap-1 ${
                            isSelected ? "bg-primary/15 ring-1 ring-primary text-primary" : ""
                          }`}
                          style={
                            isSelected
                              ? undefined
                              : isPublished
                              ? { background: "hsl(var(--success) / 0.20)", color: "hsl(var(--success))", borderColor: "hsl(var(--success) / 0.30)", borderWidth: 1, borderStyle: "solid" }
                              : { background: color.bg, color: color.text, borderColor: color.border, borderWidth: 1, borderStyle: "solid" }
                          }
                        >
                          {p.platform === "instagram" ? (
                            <Instagram className="h-2.5 w-2.5 text-pink-500 shrink-0" />
                          ) : (
                            <Facebook className="h-2.5 w-2.5 text-blue-600 shrink-0" />
                          )}
                          <span className="truncate">{p.caption.slice(0, 20) || "Sem legenda"}</span>
                          {(p as any).clients?.name && (
                            <span className="shrink-0" style={{ opacity: 0.7 }}>· {(p as any).clients.name}</span>
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
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium text-foreground">
                              {p.status === "draft" && "Rascunho"}
                              {p.status === "pending_approval" && "Pendente de aprovação"}
                              {p.status === "approved" && "Aprovado"}
                              {p.status === "scheduled" && "Agendado"}
                              {p.status === "publishing" && "Publicando"}
                              {p.status === "published" && "Publicado"}
                              {p.status === "error" && "Erro"}
                              {p.status === "cancelled" && "Cancelado"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Deadline:</span>
                            <span className="font-medium text-foreground">
                              {p.scheduled_at ? format(new Date(p.scheduled_at), "dd/MM/yyyy") : format(new Date(p.created_at), "dd/MM/yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">Cliente:</span>
                            <span className="font-medium text-foreground">{(p as any).clients?.name || "—"}</span>
                          </div>
                        </div>
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
            {selectedItem && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                <div className="flex items-center gap-2">
                  {selectedItem.type === "social" ? (
                    selectedItem.post.platform === "instagram" ? (
                      <Instagram className="h-4 w-4 text-pink-500" />
                    ) : (
                      <Facebook className="h-4 w-4 text-blue-600" />
                    )
                  ) : (
                    <FileText className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">
                    {selectedItem.type === "social"
                      ? selectedItem.post.caption?.slice(0, 50) || "Sem legenda"
                      : selectedItem.post.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Atualmente em: {format(new Date(getSelectedDate()), "dd/MM/yyyy")}
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
