import { useState, useEffect, memo } from "react";
import { LazyImage, LazyVideo } from "@/components/LazyImage";
import { ExternalLinkCard, isExternalLink } from "@/components/ExternalLinkCard";
import { detectExternalVideo } from "@/lib/videoEmbed";
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
import {
  Calendar,
  MessageCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Download,
  DownloadCloud,
  DollarSign,
  Check,
  Play,
  Users,
  Pencil,
} from "lucide-react";
import { ApprovalLinkButton } from "@/components/ApprovalLinkButton";
import { InternalApprovalDialog } from "@/components/InternalApprovalDialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isPostInvoiced, invoicePostAuto, getPostInvoiceItem, deleteInvoiceItem } from "@/hooks/useInvoices";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { LinkedText } from "@/components/LinkedText";

// --- Sub-componentes auxiliares ---

const STATUS_KEYS: Record<PostStatus, string> = {
  entrada: "statusEntry",
  em_desenvolvimento: "statusInDevelopment",
  escrevendo_legenda: "statusWritingCaption",
  pronto: "statusReady",
  finalizado: "statusFinalized",
  alteracao_solicitada: "statusChangeRequested",
  agendado: "statusScheduled",
};

const LABEL_KEYS: Record<ClientLabel, string> = {
  pendente: "labelPending",
  aprovado: "labelApproved",
  alteracao_solicitada: "labelChangeRequested",
  leia_comentario: "labelReadComment",
  de_seu_feedback: "labelGiveFeedback",
};

const SortableThumb = ({ url, index, isActive }: { url: string; index: number; isActive: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `thumb-${index}`,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const isExternal = isExternalLink(url);
  const isVideo = !isExternal && url.match(/\.(mp4|webm|mov|avi)/i);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative h-10 w-10 shrink-0 rounded overflow-hidden cursor-grab active:cursor-grabbing border-2 transition-colors ${isActive ? "border-accent" : "border-transparent hover:border-muted-foreground/50"}`}
    >
      {isExternal ? (
        <div className="h-full w-full bg-muted flex items-center justify-center">
          <Play className="h-3 w-3 text-muted-foreground" />
        </div>
      ) : isVideo ? (
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

// --- Funções de Download ---
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

export const PostCard = memo(
  ({
    post,
    isAdmin,
    hideFeedback,
    allowEditCaption,
    allowClientDownload,
    onStatusChange,
    onDelete,
    onEdit,
    selectionMode,
    isSelected,
    onToggleSelect,
  }: PostCardProps) => {
    const { addComment, updateClientLabel, updatePost, tags, clientId } = usePosts();
    const { t } = useI18n();

    // Estados de UI
    const [expanded, setExpanded] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [mediaIndex, setMediaIndex] = useState(0);
    const [localMediaOrder, setLocalMediaOrder] = useState<string[] | null>(null);

    // Novos Estados de Edição de Legenda
    const [isEditingCaption, setIsEditingCaption] = useState(false);
    const [editedCaption, setEditedCaption] = useState(post.caption);

    // Invoice state
    const [invoiceStatus, setInvoiceStatus] = useState<"loading" | "not_invoiced" | "invoiced">("loading");
    const [invoicing, setInvoicing] = useState(false);
    const [uninvoicing, setUninvoicing] = useState(false);
    const [internalApprovalOpen, setInternalApprovalOpen] = useState(false);

    const baseMedia = post.mediaUrls.length > 0 ? post.mediaUrls : post.imageUrl ? [post.imageUrl] : [];
    const allMedia = localMediaOrder || baseMedia;

    const thumbSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    useEffect(() => {
      if (!isAdmin) return;
      let cancelled = false;
      isPostInvoiced(post.id).then((invoiced) => {
        if (!cancelled) setInvoiceStatus(invoiced ? "invoiced" : "not_invoiced");
      });
      return () => {
        cancelled = true;
      };
    }, [post.id, isAdmin]);

    const handleSaveCaption = async () => {
      try {
        await updatePost(post.id, { caption: editedCaption });
        setIsEditingCaption(false);
        toast({ title: "Sucesso!", description: "Legenda atualizada com sucesso." });
      } catch (error) {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível atualizar a legenda.",
          variant: "destructive",
        });
      }
    };

    const handleQuickInvoice = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!clientId || invoicing) return;

      if (invoiceStatus === "invoiced") {
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
        toast({ title: "Erro ao faturar", description: err.message, variant: "destructive" });
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
      updatePost(post.id, { mediaUrls: newOrder, imageUrl: newOrder[0] || "" });
    };

    const primaryStatus = post.status[0] || "entrada";
    const labelConfig = LABEL_CONFIG[post.clientLabel];
    const isOverdue = post.deadline ? new Date() > post.deadline && !post.status.includes("pronto") : false;

    const handleAddComment = () => {
      if (!commentText.trim()) return;
      addComment(post.id, isAdmin ? "Admin" : "Cliente", commentText.trim());
      setCommentText("");
    };

    const hasMedia = allMedia.length > 0;
    const isCompact = !hasMedia && isAdmin;

    return (
      <Card
        className={`overflow-hidden transition-all duration-200 hover:shadow-lg ${isAdmin ? "cursor-pointer" : ""} ${selectionMode && isSelected ? "ring-2 ring-accent shadow-lg" : ""}`}
        onClick={() => (selectionMode ? onToggleSelect?.(post.id) : isAdmin && onEdit?.())}
      >
        <div className="p-4 pb-2">
          <div className="flex items-start gap-2">
            {selectionMode && (
              <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect?.(post.id)} />
              </div>
            )}
            <h3 className={`font-bold leading-snug text-foreground ${isCompact ? "text-sm" : "text-lg"} flex-1`}>
              {post.title}
            </h3>
            {isAdmin && invoiceStatus === "invoiced" && (
              <Badge
                variant="outline"
                className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-1.5 py-0 shrink-0"
              >
                <Check className="h-2.5 w-2.5 mr-0.5" />
                Faturado
              </Badge>
            )}
          </div>
        </div>

        {hasMedia && (
          <>
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/5" }}>
              {(() => {
                const currentUrl = allMedia[mediaIndex] || allMedia[0];
                if (isExternalLink(currentUrl))
                  return (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted/30 p-6">
                      <ExternalLinkCard url={currentUrl} />
                    </div>
                  );
                const isVideo = currentUrl?.match(/\.(mp4|webm|mov|avi)/i) || post.mediaType === "video";
                return isVideo ? (
                  <LazyVideo src={currentUrl} className="h-full w-full object-cover" />
                ) : (
                  <LazyImage src={currentUrl} alt={post.title} className="h-full w-full object-cover" />
                );
              })()}

              {allMedia.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMediaIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 hover:bg-background"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMediaIndex((prev) => (prev + 1) % allMedia.length);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-1 hover:bg-background"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              <div className="absolute bottom-2 right-2 flex items-center gap-1.5 flex-wrap justify-end">
                {post.status.map((s) => (
                  <span
                    key={s}
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${STATUS_CONFIG[s].color}`}
                  >
                    {t(STATUS_KEYS[s] as any)}
                  </span>
                ))}
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${labelConfig.color}`}
                >
                  {t(LABEL_KEYS[post.clientLabel] as any)}
                </span>
              </div>
            </div>

            {isAdmin && allMedia.length > 1 && (
              <div className="px-2 py-1.5 bg-muted/30" onClick={(e) => e.stopPropagation()}>
                <DndContext sensors={thumbSensors} collisionDetection={closestCenter} onDragEnd={handleThumbDragEnd}>
                  <SortableContext
                    items={allMedia.map((_, i) => `thumb-${i}`)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="flex gap-1.5 overflow-x-auto">
                      {allMedia.map((url, i) => (
                        <SortableThumb key={`${url}-${i}`} url={url} index={i} isActive={i === mediaIndex} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </>
        )}

        <div className={`px-4 space-y-3 ${isCompact ? "pb-3 pt-1" : "p-4 pt-3"}`}>
          {/* Lógica da Legenda Unificada */}
          {post.caption && (
            <div className="mt-1" onClick={(e) => e.stopPropagation()}>
              {(isAdmin || allowEditCaption) && isEditingCaption ? (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <Textarea
                    value={editedCaption}
                    onChange={(e) => setEditedCaption(e.target.value)}
                    className="min-h-[180px] text-sm bg-white border-primary/20 focus:ring-accent leading-relaxed resize-none shadow-inner"
                    placeholder="Edite a legenda aqui..."
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsEditingCaption(false);
                        setEditedCaption(post.caption);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                      onClick={handleSaveCaption}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className={`group relative bg-zinc-50/80 rounded-xl p-4 border border-zinc-100 transition-all ${isAdmin || allowEditCaption ? "hover:border-indigo-200 cursor-text" : ""}`}
                  onClick={() => (isAdmin || allowEditCaption) && setIsEditingCaption(true)}
                >
                  {(isAdmin || allowEditCaption) && (
                    <div className="absolute top-2 right-2 p-1.5 bg-white shadow-sm border rounded-md text-indigo-600 opacity-0 group-hover:opacity-100 transition-all hover:scale-110">
                      <Pencil size={14} />
                    </div>
                  )}
                  <div className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                    <LinkedText text={post.caption} />
                  </div>
                  {(isAdmin || allowEditCaption) && (
                    <p className="text-[10px] text-zinc-400 mt-2 italic opacity-0 group-hover:opacity-100 transition-opacity">
                      Clique para editar legenda
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tags e Deadline */}
          <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
            {isAdmin ? (
              <TagSelector selectedTagIds={post.tags} onChange={(tagIds) => updatePost(post.id, { tags: tagIds })} />
            ) : (
              <TagDisplay tagIds={post.tags} tags={tags} />
            )}

            {post.deadline && (
              <div
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium w-fit ${isOverdue ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
              >
                <Calendar className="h-3.5 w-3.5" />
                {isAdmin
                  ? format(post.deadline, "dd/MM")
                  : `${t("publishForecast") as any} ${format(post.deadline, "dd/MM/yyyy")}`}
              </div>
            )}
          </div>

          {/* Ações Administrativas */}
          {isAdmin && (
            <div className="flex items-center gap-2 pt-1 border-t mt-2" onClick={(e) => e.stopPropagation()}>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex-1 flex items-center gap-1.5 rounded-md border border-muted-foreground/20 px-2 py-1.5 hover:bg-muted/50 transition-colors">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Status</span>
                    <ChevronDown className="h-3 w-3 ml-auto" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-2">
                  {(Object.keys(STATUS_CONFIG) as PostStatus[]).map((key) => (
                    <button
                      key={key}
                      onClick={() =>
                        onStatusChange?.(
                          post.status.includes(key) ? post.status.filter((s) => s !== key) : [...post.status, key],
                        )
                      }
                      className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
                    >
                      <Checkbox checked={post.status.includes(key)} className="h-3.5 w-3.5" />
                      <span className={`px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[key].color}`}>
                        {t(STATUS_KEYS[key] as any)}
                      </span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={invoiceStatus === "invoiced" ? "default" : "ghost"}
                      size="icon"
                      onClick={handleQuickInvoice}
                      className={invoiceStatus === "invoiced" ? "bg-emerald-600 text-white" : ""}
                    >
                      {invoiceStatus === "invoiced" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <DollarSign className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Faturar</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <Button variant="ghost" size="icon" onClick={() => setInternalApprovalOpen(true)}>
                <Users className="h-4 w-4 text-primary" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete?.()} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>

              <InternalApprovalDialog
                open={internalApprovalOpen}
                onOpenChange={setInternalApprovalOpen}
                postId={post.id}
                postTitle={post.title}
                clientId={clientId}
              />
            </div>
          )}

          {/* Seletor do Cliente */}
          {!isAdmin && !hideFeedback && (
            <div onClick={(e) => e.stopPropagation()} className="pt-2">
              <Select value={post.clientLabel} onValueChange={(v) => updateClientLabel(post.id, v as ClientLabel)}>
                <SelectTrigger className="h-11 w-full bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de_seu_feedback">💬 {t("labelGiveFeedback" as any)}</SelectItem>
                  <SelectItem value="aprovado">✅ {t("labelApproved" as any)}</SelectItem>
                  <SelectItem value="alteracao_solicitada">✏️ {t("labelChangeRequested" as any)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Comentários */}
          {!hideFeedback && (
            <div className="pt-2 border-t mt-4" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {post.comments.length} {t("comments" as any)}
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {expanded && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                  {post.comments.map((c) => (
                    <div key={c.id} className="bg-muted/40 p-2 rounded-lg text-xs">
                      <div className="flex justify-between font-bold mb-1">
                        <span>{c.author}</span>
                        <span className="opacity-50 font-normal">{format(c.createdAt, "dd/MM")}</span>
                      </div>
                      <p className="text-zinc-600">{c.text}</p>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Textarea
                      placeholder={t("writeComment" as any)}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="min-h-[40px] text-xs resize-none"
                    />
                    <Button size="icon" className="h-10 w-10 shrink-0" onClick={handleAddComment}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  },
);

PostCard.displayName = "PostCard";
