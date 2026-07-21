import { Post, STATUS_CONFIG, LABEL_CONFIG, Tag, TAG_TRANSLATION_KEYS, PostStatus, ClientLabel } from "@/types/post";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, History, CheckCircle2, AlertTriangle, Tag as TagIcon, RotateCcw, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { useUserRole } from "@/hooks/useUserRole";
import { useI18n } from "@/i18n/I18nContext";
import { LinkedText } from "@/components/LinkedText";
import { RichCaption } from "@/components/RichCaption";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { toast } from "sonner";
import { getContrastColor } from "@/lib/utils";
import { htmlToPlainText } from "@/lib/htmlToPlain";

const RESET_LABEL: Record<string, string> = {
  pt: "Resetar para Pendente",
  en: "Reset to Pending",
  it: "Ripristina in Attesa",
  es: "Restablecer a Pendiente",
  sv: "Återställ till Väntande",
};

const RESET_TOAST: Record<string, string> = {
  pt: "Post resetado para pendente",
  en: "Post reset to pending",
  it: "Post ripristinato in attesa",
  es: "Publicación restablecida a pendiente",
  sv: "Inlägg återställt till väntande",
};

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
  design_pronto: "statusDesignReady",
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
  const [copied, setCopied] = useState(false);
  const activityLogs = useActivityLogs({ itemId: post?.id || "", enabled: open && showHistory && !!post });
  const { isAdmin } = useUserRole();
  const { locale } = useI18n();

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
                  <ChevronLeft className="h-5 w-5 text-primary-foreground" />
                </button>
                <button
                  onClick={() => setMediaIndex((prev) => (prev + 1) % allMedia.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 hover:bg-background shadow-md"
                >
                  <ChevronRight className="h-5 w-5 text-primary-foreground" />
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
            {isAdmin && onUpdateLabel && post.clientLabel === "aprovado" && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs ml-auto"
                onClick={() => {
                  onUpdateLabel(post.id, "pendente");
                  toast.success(RESET_TOAST[locale] ?? RESET_TOAST.pt);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {RESET_LABEL[locale] ?? RESET_LABEL.pt}
              </Button>
            )}
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
                    style={{ backgroundColor: tag.color, color: getContrastColor(tag.color) }}
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
            <div className="relative rounded-xl p-4 sm:p-5 bg-white text-black shadow-sm border border-white/20">
              <div className="flex items-center justify-between mb-2 gap-2">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-black/50">
                  {post.artType === "text" ? "Texto" : t("fullCaption")}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(htmlToPlainText(post.caption || ""));
                      setCopied(true);
                      toast.success(t("copied") || "Copiado!");
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      toast.error("Erro ao copiar");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-black/70 hover:text-black hover:bg-black/5 transition-colors"
                  aria-label="Copiar legenda"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
              <div className="text-[16px] sm:text-[17px] leading-[1.7] font-medium">
                <RichCaption text={post.caption} />
              </div>
            </div>
          )}

          {/* Client action buttons */}
          {(onApprove || onRequestChange) && post.clientLabel !== "aprovado" && (
            <div className="border-t border-white/20 pt-4 mt-2 space-y-3">
              <p className="text-sm font-medium text-white">{t("whatDidYouThink")}</p>

              {!showChangeForm ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  {onApprove && (
                    <Button
                      size="lg"
                      className="bg-success text-success-foreground hover:bg-success/90 gap-2 h-12 text-base font-semibold flex-1"
                      onClick={() => {
                        onApprove(post.id);
                        toast.success(t("approvedSuccess"));
                        onOpenChange(false);
                      }}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      {t("approvedByBoss")}
                    </Button>
                  )}
                  {onRequestChange && (
                    <Button
                      size="lg"
                      variant="destructive"
                      className="gap-2 h-12 text-base font-semibold flex-1"
                      onClick={() => setShowChangeForm(true)}
                    >
                      <AlertTriangle className="h-5 w-5" />
                      {t("requestChanges")}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    placeholder={t("describeChange")}
                    value={changeComment}
                    onChange={(e) => setChangeComment(e.target.value)}
                    className="min-h-[96px] text-base bg-white text-black"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="lg"
                      variant="destructive"
                      className="h-12 text-base font-semibold flex-1"
                      disabled={!changeComment.trim()}
                      onClick={() => {
                        onRequestChange!(post.id, changeComment.trim());
                        toast.success(t("changeRequestedSuccess"));
                        setChangeComment("");
                        setShowChangeForm(false);
                        onOpenChange(false);
                      }}
                    >
                      {t("sendRequest")}
                    </Button>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="h-12 text-base text-white hover:bg-white/10"
                      onClick={() => { setShowChangeForm(false); setChangeComment(""); }}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              )}

              {post.clientLabel === "alteracao_solicitada" && (
                <p className="text-xs text-red-400 font-medium">{t("changeAlreadyRequested")}</p>
              )}
            </div>
          )}

          {/* Admin label dropdown */}
          {onUpdateLabel && !onApprove && (
            <div className="border-t border-white/20 pt-4 mt-2 space-y-3">
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-white/60" />
                <span className="text-sm font-medium text-white">{t("clientLabelTitle")}</span>
              </div>
              <Select
                value={post.clientLabel}
                onValueChange={(value: ClientLabel) => {
                  if (value === "alteracao_solicitada") {
                    setShowChangeForm(true);
                  } else {
                    onUpdateLabel(post.id, value);
                    toast.success(t("labelUpdated"));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">
                    <span className="flex items-center gap-2">⏳ {t("labelPending")}</span>
                  </SelectItem>
                  <SelectItem value="aprovado">
                    <span className="flex items-center gap-2">✅ {t("approvedByBoss")}</span>
                  </SelectItem>
                  <SelectItem value="alteracao_solicitada">
                    <span className="flex items-center gap-2">⚠️ {t("requestChanges")}</span>
                  </SelectItem>
                  <SelectItem value="de_seu_feedback">
                    <span className="flex items-center gap-2">💬 {t("labelGiveFeedback")}</span>
                  </SelectItem>
                  <SelectItem value="leia_comentario">
                    <span className="flex items-center gap-2">📖 {t("labelReadComment")}</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {showChangeForm && (
                <div className="space-y-2">
                  <Textarea
                    placeholder={t("describeChange")}
                    value={changeComment}
                    onChange={(e) => setChangeComment(e.target.value)}
                    className="min-h-[96px] text-base bg-white text-black"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      size="lg"
                      variant="destructive"
                      className="h-12 text-base font-semibold flex-1"
                      disabled={!changeComment.trim()}
                      onClick={() => {
                        onUpdateLabel(post.id, "alteracao_solicitada", changeComment.trim());
                        toast.success(t("changeRequestedSuccess"));
                        setChangeComment("");
                        setShowChangeForm(false);
                      }}
                    >
                      {t("sendRequest")}
                    </Button>
                    <Button
                      size="lg"
                      variant="ghost"
                      className="h-12 text-base text-white hover:bg-white/10"
                      onClick={() => { setShowChangeForm(false); setChangeComment(""); }}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors pt-2">
            <History className="h-3.5 w-3.5 text-white/50" />
            {showHistory ? t("hideHistory") : t("viewActivityHistory")}
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
