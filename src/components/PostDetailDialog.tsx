import { Post, STATUS_CONFIG, LABEL_CONFIG, Tag, TAG_TRANSLATION_KEYS, PostStatus, ClientLabel } from "@/types/post";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, History, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useActivityLogs } from "@/hooks/useActivityLogs";
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

export const PostDetailDialog = ({ post, open, onOpenChange, tags, t, onApprove, onRequestChange }: PostDetailDialogProps) => {
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
          <h2 className="text-xl font-bold text-foreground">{post.title}</h2>

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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{t("publishForecast")} {format(post.deadline, "dd/MM/yyyy")}</span>
            </div>
          )}

          {post.caption && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{post.caption}</p>
          )}

          {/* Activity History Toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors pt-2"
          >
            <History className="h-3.5 w-3.5" />
            {showHistory ? "Ocultar histórico" : "Ver histórico de atividades"}
          </button>

          {showHistory && (
            <div className="border-t pt-3 mt-2">
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
