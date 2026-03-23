import { useState, useEffect, memo } from "react";
import { LazyImage, LazyVideo } from "@/components/LazyImage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Post, PostStatus, ClientLabel, STATUS_CONFIG, LABEL_CONFIG } from "@/types/post";
import { usePosts } from "@/context/PostsContext";
import { useI18n } from "@/i18n/I18nContext";
import { TagDisplay } from "@/components/TagSelector";
import { TagSelector } from "@/components/TagSelector";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MessageCircle, Trash2, ChevronDown, ChevronUp, Send, ChevronLeft, ChevronRight, GripVertical, Download, DownloadCloud, DollarSign, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { PostTrackingLabels } from "@/components/PostTrackingLabels";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { isPostInvoiced, invoicePostAuto, getPostInvoiceItem, deleteInvoiceItem } from "@/hooks/useInvoices";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const CaptionText = ({ text, t }: { text: string; t: (key: keyof typeof import("@/i18n/translations").translations.pt) => string }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 150;
  return (
    <div>
      <p className={`text-sm text-muted-foreground ${!expanded && isLong ? "line-clamp-3" : ""}`}>{text}</p>
      {isLong && (
        <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="text-xs font-medium text-primary hover:underline mt-1">
          {expanded ? t("readLess") : t("readMore")}
        </button>
      )}
    </div>
  );
};

const STATUS_KEYS: Record<PostStatus, "statusEntry" | "statusInDevelopment" | "statusWritingCaption" | "statusReady" | "statusFinalized" | "statusChangeRequested" | "statusScheduled"> = {
  entrada: "statusEntry",
  em_desenvolvimento: "statusInDevelopment",
  escrevendo_legenda: "statusWritingCaption",
  pronto: "statusReady",
  finalizado: "statusFinalized",
  alteracao_solicitada: "statusChangeRequested",
  agendado: "statusScheduled",
};

const LABEL_KEYS: Record<ClientLabel, "labelPending" | "labelApproved" | "labelChangeRequested" | "labelReadComment" | "labelGiveFeedback"> = {
  pendente: "labelPending",
  aprovado: "labelApproved",
  alteracao_solicitada: "labelChangeRequested",
  leia_comentario: "labelReadComment",
  de_seu_feedback: "labelGiveFeedback",
};

interface PostCardProps {
  post: Post;
  isAdmin: boolean;
  hideFeedback?: boolean;
  allowEditCaption?: boolean;
  allowClientDownload?: boolean;
  onStatusChange?: (status: PostStatus[]) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

const SortableThumb = ({ url, index, isActive }: { url: string; index: number; isActive: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `thumb-${index}` });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isVideo = url.match(/\.(mp4|webm|mov|avi)/i);
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative h-10 w-10 shrink-0 rounded overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-colors ${isActive ? "border-accent" : "border-transparent hover:border-muted-foreground/50"}`}
    >
      {isVideo ? (
        <video src={url} className="h-full w-full object-cover" muted />
      ) : (
        <img src={url} alt="" className="h-full w-full object-cover" />
      )}
      {index === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-accent/30">
          <span className="text-[7px] font-bold text-accent-foreground">CAPA</span>
        </div>
      )}
    </div>
  );
};

const downloadFile = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, "_blank");
  }
};

const downloadAllFiles = async (urls: string[], postTitle: string) => {
  for (let i = 0; i < urls.length; i++) {
    const ext = urls[i].split(".").pop()?.split("?")[0] || "jpg";
    await downloadFile(urls[i], `${postTitle}_${i + 1}.${ext}`);
  }
};

export const PostCard = ({ post, isAdmin, hideFeedback, allowEditCaption, allowClientDownload, onStatusChange, onDelete, onEdit, selectionMode, isSelected, onToggleSelect }: PostCardProps) => {
  const { addComment, updateClientLabel, updatePost, tags, clientId } = usePosts();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [mediaIndex, setMediaIndex] = useState(0);
  const [localMediaOrder, setLocalMediaOrder] = useState<string[] | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState(post.caption);

  // Invoice state
  const [invoiceStatus, setInvoiceStatus] = useState<"loading" | "not_invoiced" | "invoiced">("loading");
  const [invoicing, setInvoicing] = useState(false);
  const [uninvoicing, setUninvoicing] = useState(false);

  const baseMedia = post.mediaUrls.length > 0 ? post.mediaUrls : post.imageUrl ? [post.imageUrl] : [];
  const allMedia = localMediaOrder || baseMedia;

  const thumbSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Check invoice status on mount
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    isPostInvoiced(post.id).then(invoiced => {
      if (!cancelled) setInvoiceStatus(invoiced ? "invoiced" : "not_invoiced");
    });
    return () => { cancelled = true; };
  }, [post.id, isAdmin]);

  const handleQuickInvoice = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!clientId || invoicing) return;
    
    if (invoiceStatus === "invoiced") {
      // Un-invoice
      setUninvoicing(true);
      try {
        const item = await getPostInvoiceItem(post.id);
        if (item) {
          await deleteInvoiceItem(item.id);
          setInvoiceStatus("not_invoiced");
          toast({ title: "Post removido da fatura" });
        }
      } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      } finally {
        setUninvoicing(false);
      }
      return;
    }

    setInvoicing(true);
    try {
      const result = await invoicePostAuto(clientId, {
        id: post.id,
        title: post.title,
        caption: post.caption,
        mediaType: post.mediaType,
      });
      setInvoiceStatus("invoiced");
      toast({ title: `Adicionado à fatura "${result.invoiceTitle}"` });
    } catch (err: any) {
      if (err.message === "ALREADY_INVOICED") {
        setInvoiceStatus("invoiced");
        toast({ title: "Este post já está faturado" });
      } else {
        toast({ title: "Erro ao faturar", description: err.message, variant: "destructive" });
      }
    } finally {
      setInvoicing(false);
    }
  };

  const handleThumbDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parseInt((active.id as string).replace("thumb-", ""));
    const newIndex = parseInt((over.id as string).replace("thumb-", ""));
    const newOrder = arrayMove(allMedia, oldIndex, newIndex);
    setLocalMediaOrder(newOrder);
    setMediaIndex(0);
    updatePost(post.id, {
      mediaUrls: newOrder,
      imageUrl: newOrder[0] || "",
    });
  };

  const primaryStatus = post.status[0] || "entrada";
  const statusConfig = STATUS_CONFIG[primaryStatus];
  const labelConfig = LABEL_CONFIG[post.clientLabel];
  const isOverdue = post.deadline ? new Date() > post.deadline && !post.status.includes("pronto") : false;

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment(post.id, isAdmin ? "Admin" : "Cliente", commentText.trim());
    setCommentText("");
  };

  const hasMedia = allMedia.length > 0;
  const isCompact = !hasMedia && isAdmin;

  const handleCardClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(post.id);
    } else if (isAdmin) {
      onEdit?.();
    }
  };

  const hasAlteradoTag = post.tags.includes("alterado");

  return (
    <Card
      className={`overflow-hidden transition-shadow hover:shadow-md ${isAdmin ? "cursor-pointer" : ""} ${selectionMode && isSelected ? "ring-2 ring-accent shadow-lg" : ""} ${!isAdmin && hasAlteradoTag ? "ring-2 ring-warning" : ""}`}
      onClick={handleCardClick}
    >
      {!isAdmin && hasAlteradoTag && (
        <div className="bg-warning px-3 py-1.5 text-center text-xs font-bold text-warning-foreground">
          ✏️ {t("tagAltered") || "Alterado"} — Verifique as alterações
        </div>
      )}
      <div className={`p-4 ${isCompact ? "pb-2" : "pb-2"}`}>
        <div className="flex items-start gap-2">
          {selectionMode && (
            <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onToggleSelect?.(post.id)}
              />
            </div>
          )}
          <h3 className={`font-bold leading-snug text-foreground ${isCompact ? "text-sm" : "text-lg"} flex-1`}>{post.title}</h3>
          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && invoiceStatus === "invoiced" && (
              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-1.5 py-0">
                <Check className="h-2.5 w-2.5 mr-0.5" />Faturado
              </Badge>
            )}
            {post.trelloCardId && (
              <span title="Sincronizado com Trello">
                <svg className="h-4 w-4 text-[#0079BF]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 3H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM10.5 17a1.5 1.5 0 0 1-1.5-1.5V7a1.5 1.5 0 0 1 3 0v8.5a1.5 1.5 0 0 1-1.5 1.5zm5-3a1.5 1.5 0 0 1-1.5-1.5V7a1.5 1.5 0 0 1 3 0v6.5a1.5 1.5 0 0 1-1.5 1.5z"/>
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>

      {hasMedia && (
        <>
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/5" }}>
            {(() => {
              const currentUrl = allMedia[mediaIndex] || allMedia[0];
              const isVideo = currentUrl?.match(/\.(mp4|webm|mov|avi)/i) || post.mediaType === "video";
              return isVideo ? (
                <video src={currentUrl} className="h-full w-full object-cover" controls muted />
              ) : (
                <img src={currentUrl} alt={post.title} className="h-full w-full object-cover" />
              );
            })()}
            {allMedia.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setMediaIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 hover:bg-background"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMediaIndex((prev) => (prev + 1) % allMedia.length); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 hover:bg-background"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1">
                  {allMedia.map((_, i) => (
                    <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === mediaIndex ? "bg-primary-foreground" : "bg-primary-foreground/40"}`} />
                  ))}
                </div>
              </>
            )}
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5 flex-wrap justify-end">
            {post.status.filter((s) => isAdmin || s !== "pronto").map((s) => (
              <span key={s} className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${STATUS_CONFIG[s].color}`}>
                {t(STATUS_KEYS[s])}
              </span>
            ))}
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${labelConfig.color}`}>
                {t(LABEL_KEYS[post.clientLabel])}
              </span>
            </div>
          </div>
          {/* Sortable thumbnail strip for admin with multiple media */}
          {isAdmin && allMedia.length > 1 && (
            <div className="px-2 py-1.5 bg-muted/30" onClick={(e) => e.stopPropagation()}>
              <DndContext sensors={thumbSensors} collisionDetection={closestCenter} onDragEnd={handleThumbDragEnd}>
                <SortableContext items={allMedia.map((_, i) => `thumb-${i}`)} strategy={horizontalListSortingStrategy}>
                  <div className="flex gap-1.5 overflow-x-auto">
                    {allMedia.map((url, i) => (
                      <SortableThumb key={`${url}-${i}`} url={url} index={i} isActive={i === mediaIndex} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}
          {/* Download buttons - for admin/team or clients with permission */}
          {(isAdmin || allowClientDownload) && (
            <div className="px-2 py-1.5 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        const currentUrl = allMedia[mediaIndex] || allMedia[0];
                        const ext = currentUrl.split(".").pop()?.split("?")[0] || "jpg";
                        downloadFile(currentUrl, `${post.title}_${mediaIndex + 1}.${ext}`);
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Baixar foto atual</TooltipContent>
                </Tooltip>
                {allMedia.length > 1 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => downloadAllFiles(allMedia, post.title)}
                      >
                        <DownloadCloud className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Baixar todas ({allMedia.length})</TooltipContent>
                  </Tooltip>
                )}
              </TooltipProvider>
            </div>
          )}
        </>
      )}

      <div className={`px-4 space-y-2 ${isCompact ? "pb-3 pt-1" : "p-4 pt-3"}`}>
        {!hasMedia && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {post.status.filter((s) => isAdmin || s !== "pronto").map((s) => (
              <span key={s} className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CONFIG[s].color}`}>
                {t(STATUS_KEYS[s])}
              </span>
            ))}
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${labelConfig.color}`}>
              {t(LABEL_KEYS[post.clientLabel])}
            </span>
          </div>
        )}

        {!isAdmin && !hideFeedback && post.deadline && (
          <div className="rounded-lg bg-primary/10 px-3 py-2 text-center">
            <span className="text-sm font-semibold text-primary">
              {t("publishForecast")} {format(post.deadline, "dd/MM/yyyy")}
            </span>
          </div>
        )}

        <div onClick={(e) => e.stopPropagation()}>
          {isAdmin ? (
            <TagSelector selectedTagIds={post.tags} onChange={(tagIds) => {
              const addedAlterado = tagIds.includes("alterado") && !post.tags.includes("alterado");
              const updates: Partial<Post> = { tags: tagIds };
              if (addedAlterado && post.clientLabel === "alteracao_solicitada") {
                updates.clientLabel = "pendente";
              }
              updatePost(post.id, updates);
            }} />
          ) : (
            <TagDisplay tagIds={post.tags} tags={tags} />
          )}
        </div>

        {!isCompact && (
          <>
            
            {post.caption && (
              isAdmin ? (
                <p className="line-clamp-3 text-sm text-muted-foreground">{post.caption}</p>
              ) : (
                allowEditCaption ? (
                  editingCaption ? (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      <Textarea
                        value={captionDraft}
                        onChange={(e) => setCaptionDraft(e.target.value)}
                        className="min-h-[80px] text-sm resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingCaption(false); setCaptionDraft(post.caption); }}>
                          Cancelar
                        </Button>
                        <Button size="sm" onClick={() => { updatePost(post.id, { caption: captionDraft }); setEditingCaption(false); }}>
                          Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="group/caption cursor-pointer" onClick={(e) => { e.stopPropagation(); setEditingCaption(true); }}>
                      <CaptionText text={post.caption} t={t} />
                      <span className="text-[10px] text-muted-foreground opacity-0 group-hover/caption:opacity-100 transition-opacity">Clique para editar</span>
                    </div>
                  )
                ) : (
                  <CaptionText text={post.caption} t={t} />
                )
              )
            )}
          </>
        )}

        {!isCompact && !hideFeedback && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="flex items-center gap-1 hover:text-foreground">
              <MessageCircle className="h-3 w-3" />
              {post.comments.length} {post.comments.length !== 1 ? t("comments") : t("comment")}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex-1 flex items-center gap-1.5 rounded-md border border-muted-foreground/20 px-2 py-1.5 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
                    {post.status.map((s) => (
                      <span key={s} className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_CONFIG[s].color}`}>
                        {t(STATUS_KEYS[s])}
                      </span>
                    ))}
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-52 p-2" align="start">
                <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Status</p>
                <div className="space-y-0.5">
                  {(Object.keys(STATUS_CONFIG) as PostStatus[]).map((key) => {
                    const isChecked = post.status.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          let newStatus: PostStatus[];
                          if (isChecked) {
                            newStatus = post.status.filter((s) => s !== key);
                          } else {
                            newStatus = [...post.status, key];
                          }
                          if (newStatus.length === 0) newStatus = [key];
                          onStatusChange?.(newStatus);
                        }}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted cursor-pointer transition-colors"
                      >
                        <Checkbox checked={isChecked} className="h-3.5 w-3.5 pointer-events-none" />
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_CONFIG[key].color}`}>
                          {t(STATUS_KEYS[key])}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant={invoiceStatus === "invoiced" ? "default" : "ghost"} 
                    size="icon" 
                    onClick={handleQuickInvoice} 
                    disabled={invoicing || uninvoicing || invoiceStatus === "loading"}
                    className={`shrink-0 ${isCompact ? "h-7 w-7" : "h-8 w-8"} ${invoiceStatus === "invoiced" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                  >
                    {invoiceStatus === "invoiced" ? <Check className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {invoiceStatus === "invoiced" ? "Desfazer faturamento" : "Faturar"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className={`text-destructive hover:text-destructive shrink-0 ${isCompact ? "h-7 w-7" : "h-8 w-8"}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!isAdmin && !hideFeedback && (
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={post.clientLabel}
              onValueChange={(v) => {
                try {
                  updateClientLabel(post.id, v as ClientLabel);
                } catch (err) {
                  console.error("[PostCard] label change error:", err);
                }
              }}
            >
              <SelectTrigger className="h-11 w-full text-sm font-semibold bg-info text-info-foreground border-info hover:bg-info/90 rounded-lg touch-manipulation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                <SelectItem value="de_seu_feedback" className="py-3 text-sm">💬 {t("labelGiveFeedback")}</SelectItem>
                {(Object.keys(LABEL_KEYS) as ClientLabel[])
                  .filter((key) => key !== "de_seu_feedback")
                  .map((key) => (
                    <SelectItem key={key} value={key} className="py-3 text-sm">{t(LABEL_KEYS[key])}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {(expanded || !isAdmin) && !isCompact && !hideFeedback && (
        <div className="border-t bg-muted/30 p-4" onClick={(e) => e.stopPropagation()}>
          <div className="space-y-3">
            {post.comments.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("noComments")}</p>
            )}
            {post.comments.map((c) => (
              <div key={c.id} className="rounded-lg bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{c.author}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(c.createdAt, "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{c.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Textarea
              placeholder={t("writeComment")}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
            />
            <Button size="sm" onClick={handleAddComment} className="bg-accent text-accent-foreground hover:bg-accent/90 self-end">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
