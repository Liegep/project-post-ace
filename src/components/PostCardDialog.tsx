import { useState, useEffect } from "react";
import { Post, PostStatus, ClientLabel, STATUS_CONFIG, LABEL_CONFIG, TAG_TRANSLATION_KEYS, Tag } from "@/types/post";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { LazyImage, LazyVideo } from "@/components/LazyImage";
import { ExternalLinkCard, isExternalLink } from "@/components/ExternalLinkCard";
import { LinkedText } from "@/components/LinkedText";
import { ApprovalLinkButton } from "@/components/ApprovalLinkButton";
import { InternalApprovalDialog } from "@/components/InternalApprovalDialog";
import { TagSelector, TagDisplay } from "@/components/TagSelector";
import { usePosts } from "@/context/PostsContext";
import { useI18n } from "@/i18n/I18nContext";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { isPostInvoiced, invoicePostAuto, getPostInvoiceItem, deleteInvoiceItem } from "@/hooks/useInvoices";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Calendar, MessageCircle, Trash2, Send, ChevronLeft, ChevronRight,
  DollarSign, Check, Users, Pencil, History, X, ChevronDown,
  Download, DownloadCloud, Play,
} from "lucide-react";

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

interface PostCardDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onStatusChange?: (status: PostStatus[]) => void;
  onDelete?: () => void;
  onEdit?: () => void;
  allowEditCaption?: boolean;
  allowClientDownload?: boolean;
  hideFeedback?: boolean;
}

export function PostCardDialog({
  post,
  open,
  onOpenChange,
  isAdmin,
  onStatusChange,
  onDelete,
  onEdit,
  allowEditCaption,
  allowClientDownload,
  hideFeedback,
}: PostCardDialogProps) {
  const { addComment, updateClientLabel, updatePost, tags, clientId } = usePosts();
  const { t } = useI18n();

  const [mediaIndex, setMediaIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState<"loading" | "not_invoiced" | "invoiced">("loading");
  const [invoicing, setInvoicing] = useState(false);
  const [uninvoicing, setUninvoicing] = useState(false);
  const [internalApprovalOpen, setInternalApprovalOpen] = useState(false);

  const activityLogs = useActivityLogs({ itemId: post?.id || "", enabled: open && showHistory && !!post });

  useEffect(() => {
    if (post) {
      setEditedCaption(post.caption);
      setMediaIndex(0);
    }
  }, [post?.id]);

  useEffect(() => {
    if (!isAdmin || !post) return;
    let cancelled = false;
    isPostInvoiced(post.id).then((invoiced) => {
      if (!cancelled) setInvoiceStatus(invoiced ? "invoiced" : "not_invoiced");
    });
    return () => { cancelled = true; };
  }, [post?.id, isAdmin]);

  if (!post) return null;

  const allMedia = post.mediaUrls.length > 0 ? post.mediaUrls : post.imageUrl ? [post.imageUrl] : [];
  const hasMedia = allMedia.length > 0;
  const currentUrl = allMedia[mediaIndex] || allMedia[0];
  const labelConfig = LABEL_CONFIG[post.clientLabel];
  const isOverdue = post.deadline ? new Date() > post.deadline && !post.status.includes("pronto") : false;

  const postTags = post.tags
    .map((tagId) => tags.find((t) => t.id === tagId))
    .filter(Boolean) as Tag[];

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment(post.id, isAdmin ? "Admin" : "Cliente", commentText.trim());
    setCommentText("");
  };

  const handleSaveCaption = async () => {
    try {
      await updatePost(post.id, { caption: editedCaption });
      setIsEditingCaption(false);
      toast({ title: "Legenda atualizada!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const handleQuickInvoice = async () => {
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
      } finally { setUninvoicing(false); }
      return;
    }
    setInvoicing(true);
    try {
      const result = await invoicePostAuto(clientId, {
        id: post.id, title: post.title, caption: post.caption, mediaType: post.mediaType,
      });
      setInvoiceStatus("invoiced");
      toast({ title: `Adicionado à fatura "${result.invoiceTitle}"` });
    } catch (err: any) {
      toast({ title: "Erro ao faturar", description: err.message, variant: "destructive" });
    } finally { setInvoicing(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setShowHistory(false); setIsEditingCaption(false); setCommentText(""); } }}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0 max-h-[92vh] !rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row min-h-[400px] max-h-[88vh]">
          {/* LEFT COLUMN - 70% */}
          <div className="flex-1 md:w-[70%] overflow-y-auto p-6 space-y-4">
            {/* Title */}
            <h2 className="text-xl font-bold text-white leading-tight">{post.title}</h2>

            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {isAdmin ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 rounded-md border border-white/30 px-2 py-1 text-xs hover:bg-white/20 transition-colors">
                      <span className="font-medium text-white">Status</span>
                      <ChevronDown className="h-3 w-3 text-white/70" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-2" align="start">
                    {(Object.keys(STATUS_CONFIG) as PostStatus[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => onStatusChange?.(post.status.includes(key) ? post.status.filter((s) => s !== key) : [...post.status, key])}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
                      >
                        <Checkbox checked={post.status.includes(key)} className="h-3.5 w-3.5" />
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${STATUS_CONFIG[key].color}`}>
                          {t(STATUS_KEYS[key] as any)}
                        </span>
                      </button>
                    ))}
                  </PopoverContent>
                </Popover>
              ) : null}
              {post.status.map((s) => (
                <span key={s} className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_CONFIG[s].color}`}>
                  {t(STATUS_KEYS[s] as any)}
                </span>
              ))}
              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${labelConfig.color}`}>
                {t(LABEL_KEYS[post.clientLabel] as any)}
              </span>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {isAdmin ? (
                <TagSelector selectedTagIds={post.tags} onChange={(tagIds) => updatePost(post.id, { tags: tagIds })} />
              ) : (
                postTags.map((tag) => {
                  const translationKey = TAG_TRANSLATION_KEYS[tag.id];
                  const displayName = translationKey ? t(translationKey as any) : tag.name;
                  return (
                    <span key={tag.id} className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium text-white" style={{ backgroundColor: tag.color }}>
                      {displayName}
                    </span>
                  );
                })
              )}
            </div>

            {/* Deadline */}
            {post.deadline && (
              <div className={`flex items-center gap-2 text-sm ${isOverdue ? "text-red-300 font-medium" : "text-white/80"}`}>
                <Calendar className="h-4 w-4 text-white/70" />
                <span>{t("publishForecast" as any)} {format(post.deadline, "dd/MM/yyyy")}</span>
              </div>
            )}

            {/* Media viewer */}
            {hasMedia && (
              <div className="relative w-full rounded-lg overflow-hidden bg-black/80" style={{ aspectRatio: "4/5", maxHeight: "60vh" }}>
                {(() => {
                  if (isExternalLink(currentUrl))
                    return <div className="absolute inset-0 flex items-center justify-center p-6"><ExternalLinkCard url={currentUrl} /></div>;
                  const isVideo = currentUrl?.match(/\.(mp4|webm|mov|avi)/i) || post.mediaType === "video";
                  return isVideo
                    ? <LazyVideo src={currentUrl} className="h-full w-full object-contain" />
                    : <LazyImage src={currentUrl} alt={post.title} className="h-full w-full object-contain" />;
                })()}
                {allMedia.length > 1 && (
                  <>
                    <button onClick={() => setMediaIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 hover:bg-black/70 shadow border border-white/10">
                      <ChevronLeft className="h-5 w-5 text-white" />
                    </button>
                    <button onClick={() => setMediaIndex((prev) => (prev + 1) % allMedia.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 hover:bg-black/70 shadow border border-white/10">
                      <ChevronRight className="h-5 w-5 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {allMedia.map((_, i) => (
                        <button key={i} onClick={() => setMediaIndex(i)} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === mediaIndex ? "bg-white" : "bg-white/40"}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Caption / Description */}
            <div>
              <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">Legenda</h4>
              {(isAdmin || allowEditCaption) && isEditingCaption ? (
                <div className="space-y-2">
                  <Textarea value={editedCaption} onChange={(e) => setEditedCaption(e.target.value)} className="min-h-[120px] text-sm" />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => { setIsEditingCaption(false); setEditedCaption(post.caption); }}>Cancelar</Button>
                    <Button size="sm" onClick={handleSaveCaption}>Salvar</Button>
                  </div>
                </div>
              ) : (
                <div
                  className={`text-sm whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto rounded-lg p-3 bg-white backdrop-blur-xl border border-white/20 text-zinc-900 ${(isAdmin || allowEditCaption) ? "cursor-text hover:border-white/40 group relative" : ""}`}
                  onClick={() => (isAdmin || allowEditCaption) && setIsEditingCaption(true)}
                >
                  {(isAdmin || allowEditCaption) && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="h-3.5 w-3.5 text-zinc-600" />
                    </div>
                  )}
                  {post.caption ? <LinkedText text={post.caption} /> : <span className="text-zinc-500 italic">Sem legenda</span>}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN - 30% */}
          <div className="md:w-[30%] md:min-w-[240px] border-t md:border-t-0 md:border-l border-white/20 bg-white/10 backdrop-blur-xl p-4 space-y-4 overflow-y-auto">
            {/* Actions section */}
            <div>
              <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">Ações</h4>
              <div className="space-y-1.5">
                {isAdmin && (
                  <>
                    <TooltipProvider>
                      <Button
                        variant={invoiceStatus === "invoiced" ? "default" : "outline"}
                        size="sm"
                        className={`w-full justify-start gap-2 text-xs h-8 ${invoiceStatus === "invoiced" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                        onClick={handleQuickInvoice}
                        disabled={invoicing || uninvoicing}
                      >
                        {invoiceStatus === "invoiced" ? <Check className="h-3.5 w-3.5" /> : <DollarSign className="h-3.5 w-3.5" />}
                        {invoiceStatus === "invoiced" ? "Faturado" : "Faturar"}
                      </Button>
                    </TooltipProvider>

                    <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8" onClick={() => setInternalApprovalOpen(true)}>
                      <Users className="h-3.5 w-3.5" />
                      Aprovação Interna
                    </Button>

                    {onEdit && (
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8" onClick={() => { onEdit(); onOpenChange(false); }}>
                        <Pencil className="h-3.5 w-3.5" />
                        Editar Post
                      </Button>
                    )}

                    {onDelete && (
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => { onDelete(); onOpenChange(false); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    )}
                  </>
                )}

                {/* Download buttons */}
                {(isAdmin || allowClientDownload) && hasMedia && (
                  <>
                    {allMedia.length === 1 ? (
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8" onClick={() => downloadFile(allMedia[0], `${post.title}.${allMedia[0].split('.').pop()?.split('?')[0] || 'jpg'}`)}>
                        <Download className="h-3.5 w-3.5" />
                        Baixar arquivo
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs h-8" onClick={() => downloadAllFiles(allMedia, post.title)}>
                        <DownloadCloud className="h-3.5 w-3.5" />
                        Baixar todos ({allMedia.length})
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Client feedback */}
            {!isAdmin && !hideFeedback && (
              <div>
                <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">Seu Feedback</h4>
                <Select value={post.clientLabel} onValueChange={(v) => updateClientLabel(post.id, v as ClientLabel)}>
                  <SelectTrigger className="h-9 w-full text-xs">
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

            {/* Comments */}
            {!hideFeedback && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-zinc-700" />
                  Comentários ({post.comments.length})
                </h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto mb-2">
                  {post.comments.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhum comentário</p>
                  )}
                  {post.comments.map((c) => (
                    <div key={c.id} className="bg-white/15 backdrop-blur-md p-2 rounded-lg text-[11px] border border-white/15">
                      <div className="flex justify-between font-semibold mb-0.5 text-zinc-900">
                        <span>{c.author}</span>
                        <span className="opacity-50 font-normal">{format(c.createdAt, "dd/MM")}</span>
                      </div>
                      <p className="text-zinc-700 leading-relaxed">{c.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <Textarea
                    placeholder={t("writeComment" as any)}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="min-h-[36px] text-[11px] resize-none flex-1"
                  />
                  <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleAddComment} disabled={!commentText.trim()}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Activity history */}
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                <History className="h-3.5 w-3.5 text-zinc-600" />
                {showHistory ? "Ocultar histórico" : "Ver histórico"}
              </button>
              {showHistory && (
                <div className="mt-2">
                  <ActivityTimeline
                    logs={activityLogs.logs}
                    loading={activityLogs.loading}
                    hasMore={activityLogs.hasMore}
                    onLoadMore={activityLogs.loadMore}
                    showClientName={false}
                    compact
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <InternalApprovalDialog
          open={internalApprovalOpen}
          onOpenChange={setInternalApprovalOpen}
          postId={post.id}
          postTitle={post.title}
          clientId={clientId}
        />
      </DialogContent>
    </Dialog>
  );
}
