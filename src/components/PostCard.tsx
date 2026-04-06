import { memo, useState } from "react";
import { Post, PostStatus, ClientLabel, STATUS_CONFIG, LABEL_CONFIG, TAG_TRANSLATION_KEYS } from "@/types/post";
import { usePosts } from "@/context/PostsContext";
import { useI18n } from "@/i18n/I18nContext";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LinkedText } from "@/components/LinkedText";
import { MediaLightbox } from "@/components/MediaLightbox";
import { Calendar, Play, Send } from "lucide-react";
import { format } from "date-fns";
import { isExternalLink } from "@/components/ExternalLinkCard";
import { getContrastColor } from "@/lib/utils";

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
  showInlineDetails?: boolean;
}

export const PostCard = memo(
  ({
    post,
    isAdmin,
    onEdit,
    selectionMode,
    isSelected,
    onToggleSelect,
    showInlineDetails,
  }: PostCardProps) => {
    const { tags, updateClientLabel, addComment } = usePosts();
    const { t } = useI18n();
    const [commentText, setCommentText] = useState("");
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const allMedia = post.mediaUrls.length > 0 ? post.mediaUrls : post.imageUrl ? [post.imageUrl] : [];
    const hasMedia = allMedia.length > 0;
    const thumbUrl = allMedia[0];
    const labelConfig = LABEL_CONFIG[post.clientLabel];
    const isOverdue = post.deadline ? new Date() > post.deadline && !post.status.includes("pronto") : false;

    const postTags = post.tags
      .map((tagId) => tags.find((t) => t.id === tagId))
      .filter(Boolean);

    return (
      <Card
        className={`overflow-hidden transition-all duration-150 hover:shadow-md hover:translate-y-[-1px] cursor-pointer group ${
          selectionMode && isSelected ? "ring-2 ring-accent shadow-lg" : ""
        }`}
        onClick={() => (selectionMode ? onToggleSelect?.(post.id) : onEdit?.())}
      >
        {/* Thumbnail 4:5 */}
        {hasMedia && (
          <div
            className="relative w-full overflow-hidden cursor-zoom-in"
            style={{ aspectRatio: "4/5" }}
            onClick={(e) => {
              if (!isExternalLink(thumbUrl)) {
                e.stopPropagation();
                setLightboxOpen(true);
              }
            }}
          >
            {(() => {
              if (isExternalLink(thumbUrl))
                return (
                  <div className="h-full w-full bg-muted flex items-center justify-center">
                    <Play className="h-6 w-6 text-muted-foreground" />
                  </div>
                );
              const isVideo = thumbUrl?.match(/\.(mp4|webm|mov|avi)/i) || post.mediaType === "video";
              return isVideo ? (
                <video src={thumbUrl} className="h-full w-full object-cover" muted />
              ) : (
                <img src={thumbUrl} alt={post.title} className="h-full w-full object-cover" loading="lazy" />
              );
            })()}

            {/* Media count badge */}
            {allMedia.length > 1 && (
              <div className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                {allMedia.length}
              </div>
            )}

            {/* Badges overlay at bottom of image */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent pt-6 pb-2 px-2">
              <div className="flex items-center gap-1 flex-wrap">
                {post.deadline && isAdmin && (
                  <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold text-white/90 ${isOverdue ? "text-red-300" : ""}`} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    <Calendar className="h-2.5 w-2.5" />
                    {format(post.deadline, "dd/MM")}
                  </span>
                )}
                {post.deadline && !isAdmin && (
                  <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold bg-amber-400 text-black">
                    <Calendar className="h-2.5 w-2.5" />
                    {format(post.deadline, "dd/MM")}
                  </span>
                )}
                {post.status.slice(0, 1).map((s) => (
                  <span key={s} className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-bold ${STATUS_CONFIG[s].color}`}>
                    {t(STATUS_KEYS[s] as any)}
                  </span>
                ))}
                <span className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-bold ${labelConfig.color}`}>
                  {t(LABEL_KEYS[post.clientLabel] as any)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-2.5 space-y-1.5">
          <div className="flex items-start gap-1.5">
            {selectionMode && (
              <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect?.(post.id)} />
              </div>
            )}
            <h3 className="text-sm font-bold leading-snug text-foreground line-clamp-2 flex-1">
              {post.title}
            </h3>
          </div>

          {/* Tags row */}
          {postTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {postTags.map((tag) => {
                if (!tag) return null;
                const translationKey = TAG_TRANSLATION_KEYS[tag.id];
                const displayName = translationKey ? t(translationKey as any) : tag.name;
                return (
                  <span
                    key={tag.id}
                     className="inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold"
                     style={{ backgroundColor: tag.color, color: getContrastColor(tag.color) }}
                  >
                    {displayName}
                  </span>
                );
              })}
            </div>
          )}

          {/* No-media fallback: show badges inline */}
          {!hasMedia && (
            <div className="flex items-center gap-1 flex-wrap">
              {post.deadline && isAdmin && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                  <Calendar className="h-3 w-3" />
                  {format(post.deadline, "dd/MM")}
                </span>
              )}
              {post.deadline && !isAdmin && (
                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-400 text-black">
                  <Calendar className="h-3 w-3" />
                  {format(post.deadline, "dd/MM")}
                </span>
              )}
              {post.status.slice(0, 1).map((s) => (
                <span key={s} className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold ${STATUS_CONFIG[s].color}`}>
                  {t(STATUS_KEYS[s] as any)}
                </span>
              ))}
              <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold ${labelConfig.color}`}>
                {t(LABEL_KEYS[post.clientLabel] as any)}
              </span>
            </div>
          )}

          {/* Inline details when no columns visible */}
          {showInlineDetails && !isAdmin && (
            <div className="space-y-2 pt-1 border-t border-border mt-2" onClick={(e) => e.stopPropagation()}>
              {/* Caption */}
              {post.caption && (
                <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed line-clamp-4">
                  <LinkedText text={post.caption} />
                </div>
              )}

              {/* Feedback dropdown */}
              <Select value={post.clientLabel === "pendente" ? "" : post.clientLabel} onValueChange={(v) => updateClientLabel(post.id, v as ClientLabel)}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="Escolha um feedback" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de_seu_feedback">💬 {t("labelGiveFeedback" as any)}</SelectItem>
                  <SelectItem value="aprovado">✅ {t("labelApproved" as any)}</SelectItem>
                  <SelectItem value="alteracao_solicitada">✏️ {t("labelChangeRequested" as any)}</SelectItem>
                </SelectContent>
              </Select>

              {/* Comment field */}
              <div className="flex gap-1">
                <Textarea
                  placeholder={t("writeComment" as any)}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[32px] text-[11px] resize-none flex-1"
                  rows={1}
                />
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    if (!commentText.trim()) return;
                    addComment(post.id, "Cliente", commentText.trim());
                    setCommentText("");
                  }}
                  disabled={!commentText.trim()}
                >
                  <Send className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <MediaLightbox
          urls={allMedia.filter((u) => !isExternalLink(u))}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      </Card>
    );
  },
);

PostCard.displayName = "PostCard";
