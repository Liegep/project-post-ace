import { Post, STATUS_CONFIG, LABEL_CONFIG, Tag, TAG_TRANSLATION_KEYS, PostStatus, ClientLabel } from "@/types/post";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, History, CheckCircle2, AlertTriangle, Tag as TagIcon } from "lucide-react";
import { useState } from "react";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { LinkedText } from "@/components/LinkedText";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { toast } from "sonner";

interface PostDetailDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: Tag[];
  t: (key: any) => string;
  onApprove?: (postId: string) => void;
  onRequestChange?: (postId: string, comment: string) => void;
  onUpdateLabel?: (postId: string, label: ClientLabel, comment?: string) => void;
}

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

export const PostDetailDialog = ({ post, open, onOpenChange, tags, t, onApprove, onRequestChange, onUpdateLabel }: PostDetailDialogProps) => {
  const [mediaIndex, setMediaIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [changeComment, setChangeComment] = useState("");
  const activityLogs = useActivityLogs({ itemId: post?.id || "", enabled: open && showHistory && !!post });

  if (!post) return null;

  const allMedia = post.mediaUrls.length > 0 ? post.mediaUrls : post.imageUrl ? [post.imageUrl] : [];
  const hasMedia = allMedia.length > 0;
  const currentUrl = allMedia[mediaIndex] || allMedia[0];
  const isVideo = currentUrl?.match(/\.(mp4|webm|mov|avi)/i) || post.mediaType === "video";
  const primaryStatus = post.status[0] || "entrada";
  const statusConfig = STATUS_CONFIG[primaryStatus];
  const labelConfig = LABEL_CONFIG[post.clientLabel];

  const postTags = post.tags
    .map((tagId) => tags.find((t) => t.id === tagId))
    .filter(Boolean) as Tag[];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setMediaIndex(0); setShowHistory(false); setShowChangeForm(false); setChangeComment(""); } }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 max-h-[90vh] overflow-y-auto">
        {/* Media area */}
        {hasMedia && (
          <div className="relative w-full bg-black" style={{ aspectRatio: "4/5", maxHeight: "70vh" }}>
            {isVideo ? (
              <video src={currentUrl} className="h-full w-full object-contain" controls />
            ) : (
              <img src={currentUrl} alt={post.title} className="h-full w-full object-contain" />
            )}
            {allMedia.length > 1 && (
              <>
                <button
                  onClick={() => setMediaIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 hover:bg-background shadow-md"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setMediaIndex((prev) => (prev + 1) % allMedia.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 hover:bg-background shadow-md"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {allMedia.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setMediaIndex(i)}
                      className={`h-2 w-2 rounded-full transition-colors ${i === mediaIndex ? "bg-white" : "bg-white/40"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Content area */}
        <div className="p-5 space-y-3">
          <h2 className="text-xl font-bold text-white">{post.title}</h2>

          <div className="flex flex-wrap items-center gap-2">
            {post.status.map((s) => (
              <span key={s} className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CONFIG[s].color}`}>
                {t(STATUS_KEYS[s])}
              </span>
            ))}
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${labelConfig.color}`}>
              {t(LABEL_KEYS[post.clientLabel])}
            </span>
          </div>

          {postTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {postTags.map((tag) => {
                const translationKey = TAG_TRANSLATION_KEYS[tag.id];
                const displayName = translationKey ? t(translationKey) : tag.name;
                return (
                  <span
                    key={tag.id}
                    className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ backgroundColor: tag.color, color: "#fff" }}
                  >
                    {displayName}
                  </span>
                );
              })}
            </div>
          )}

          {post.deadline && (
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Calendar className="h-4 w-4 text-white/60" />
              <span>{t("publishForecast")} {format(post.deadline, "dd/MM/yyyy")}</span>
            </div>
          )}

          {post.caption && (
            <div className="text-sm whitespace-pre-wrap leading-relaxed rounded-lg p-3 bg-white/95 text-black">
              <LinkedText text={post.caption} />
            </div>
          )}

          {/* Client action buttons */}
          {(onApprove || onRequestChange) && post.clientLabel !== "aprovado" && (
            <div className="border-t pt-4 mt-2 space-y-3">
              <p className="text-sm font-medium text-white">O que achou deste post?</p>

              
              {!showChangeForm ? (
                <div className="flex flex-wrap gap-2">
                  {onApprove && (
                    <Button
                      size="sm"
                      className="bg-success text-success-foreground hover:bg-success/90 gap-1.5"
                      onClick={() => {
                        onApprove(post.id);
                        toast.success("Post aprovado com sucesso!");
                        onOpenChange(false);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aprovado pela Boss
                    </Button>
                  )}
                  {onRequestChange && (
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      onClick={() => setShowChangeForm(true)}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Solicitar Alteração
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Descreva a alteração desejada..."
                    value={changeComment}
                    onChange={(e) => setChangeComment(e.target.value)}
                    className="min-h-[80px] text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!changeComment.trim()}
                      onClick={() => {
                        onRequestChange!(post.id, changeComment.trim());
                        toast.success("Alteração solicitada com sucesso!");
                        setChangeComment("");
                        setShowChangeForm(false);
                        onOpenChange(false);
                      }}
                    >
                      Enviar solicitação
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowChangeForm(false); setChangeComment(""); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {post.clientLabel === "alteracao_solicitada" && (
                <p className="text-xs text-destructive font-medium">Alteração já solicitada para este post.</p>
              )}
            </div>
          )}

          {/* Admin label dropdown */}
          {onUpdateLabel && !onApprove && (
            <div className="border-t pt-4 mt-2 space-y-3">
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Etiqueta do Cliente</span>
              </div>
              <Select
                value={post.clientLabel}
                onValueChange={(value: ClientLabel) => {
                  if (value === "alteracao_solicitada") {
                    setShowChangeForm(true);
                  } else {
                    onUpdateLabel(post.id, value);
                    toast.success("Etiqueta atualizada!");
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">
                    <span className="flex items-center gap-2">⏳ Pendente</span>
                  </SelectItem>
                  <SelectItem value="aprovado">
                    <span className="flex items-center gap-2">✅ Aprovado pela Boss</span>
                  </SelectItem>
                  <SelectItem value="alteracao_solicitada">
                    <span className="flex items-center gap-2">⚠️ Solicitar Alteração</span>
                  </SelectItem>
                  <SelectItem value="de_seu_feedback">
                    <span className="flex items-center gap-2">💬 Dê seu Feedback</span>
                  </SelectItem>
                  <SelectItem value="leia_comentario">
                    <span className="flex items-center gap-2">📖 Leia o Comentário</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {showChangeForm && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Descreva a alteração desejada..."
                    value={changeComment}
                    onChange={(e) => setChangeComment(e.target.value)}
                    className="min-h-[80px] text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={!changeComment.trim()}
                      onClick={() => {
                        onUpdateLabel(post.id, "alteracao_solicitada", changeComment.trim());
                        toast.success("Alteração solicitada!");
                        setChangeComment("");
                        setShowChangeForm(false);
                      }}
                    >
                      Enviar solicitação
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setShowChangeForm(false); setChangeComment(""); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors pt-2">
            <History className="h-3.5 w-3.5 text-white/50" />
            {showHistory ? "Ocultar histórico" : "Ver histórico de atividades"}
          </button>

          {showHistory && (
            <div className="border-t border-white/20 pt-3 mt-2">
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
      </DialogContent>
    </Dialog>
  );
};
