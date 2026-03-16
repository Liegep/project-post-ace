import { useState } from "react";
import { Post, PostStatus, ClientLabel, STATUS_CONFIG, LABEL_CONFIG } from "@/types/post";
import { usePosts } from "@/context/PostsContext";
import { useI18n } from "@/i18n/I18nContext";
import { TagDisplay } from "@/components/TagSelector";
import { TagSelector } from "@/components/TagSelector";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MessageCircle, Trash2, ChevronDown, ChevronUp, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const STATUS_KEYS: Record<PostStatus, "statusEntry" | "statusInDevelopment" | "statusWritingCaption" | "statusReady"> = {
  entrada: "statusEntry",
  em_desenvolvimento: "statusInDevelopment",
  escrevendo_legenda: "statusWritingCaption",
  pronto: "statusReady",
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
  onStatusChange?: (status: PostStatus) => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export const PostCard = ({ post, isAdmin, onStatusChange, onDelete, onEdit }: PostCardProps) => {
  const { addComment, updateClientLabel, updatePost, tags } = usePosts();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState("");

  const statusConfig = STATUS_CONFIG[post.status];
  const labelConfig = LABEL_CONFIG[post.clientLabel];
  const isOverdue = new Date() > post.deadline && post.status !== "pronto";

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment(post.id, isAdmin ? "Admin" : "Cliente", commentText.trim());
    setCommentText("");
  };

  const hasMedia = post.imageUrl && post.imageUrl.length > 0;
  const isCompact = !hasMedia && isAdmin;

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${isAdmin ? "cursor-pointer" : ""}`} onClick={isAdmin ? onEdit : undefined}>
      <div className={`p-4 ${isCompact ? "pb-2" : "pb-2"}`}>
        <h3 className={`font-bold leading-snug text-foreground ${isCompact ? "text-sm" : "text-lg"}`}>{post.title}</h3>
      </div>

      {hasMedia && (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/5" }}>
          {post.mediaType === "video" ? (
            <video src={post.imageUrl} className="h-full w-full object-cover" controls muted />
          ) : (
            <img src={post.imageUrl} alt={post.title} className="h-full w-full object-cover" />
          )}
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${statusConfig.color}`}>
              {t(STATUS_KEYS[post.status])}
            </span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${labelConfig.color}`}>
              {t(LABEL_KEYS[post.clientLabel])}
            </span>
          </div>
        </div>
      )}

      <div className={`px-4 space-y-2 ${isCompact ? "pb-3 pt-1" : "p-4 pt-3"}`}>
        {!hasMedia && (
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusConfig.color}`}>
              {t(STATUS_KEYS[post.status])}
            </span>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${labelConfig.color}`}>
              {t(LABEL_KEYS[post.clientLabel])}
            </span>
          </div>
        )}

        {!isAdmin && (
          <div className="rounded-lg bg-primary/10 px-3 py-2 text-center">
            <span className="text-sm font-semibold text-primary">
              Previsão de Publicação {format(post.deadline, "dd/MM/yyyy")}
            </span>
          </div>
        )}

        {!isCompact && (
          <>
            {isAdmin ? (
              <TagSelector selectedTagIds={post.tags} onChange={(tagIds) => updatePost(post.id, { tags: tagIds })} />
            ) : (
              <TagDisplay tagIds={post.tags} tags={tags} />
            )}
            {post.caption && (
              isAdmin ? (
                <p className="line-clamp-3 text-sm text-muted-foreground">{post.caption}</p>
              ) : (
                <CaptionText text={post.caption} />
              )
            )}
          </>
        )}

        {!isCompact && (
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
            <Select value={post.status} onValueChange={(v) => onStatusChange?.(v as PostStatus)}>
              <SelectTrigger className={`flex-1 text-xs ${isCompact ? "h-7" : "h-8"}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_CONFIG) as PostStatus[]).map((key) => (
                  <SelectItem key={key} value={key}>{t(STATUS_KEYS[key])}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete?.(); }} className={`text-destructive hover:text-destructive ${isCompact ? "h-7 w-7" : "h-8 w-8"}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!isAdmin && (
          <Select value={post.clientLabel} onValueChange={(v) => updateClientLabel(post.id, v as ClientLabel)}>
            <SelectTrigger className="h-9 w-full text-sm font-semibold bg-info text-info-foreground border-info hover:bg-info/90 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="de_seu_feedback">💬 {t("labelGiveFeedback")}</SelectItem>
              {(Object.keys(LABEL_KEYS) as ClientLabel[])
                .filter((key) => key !== "de_seu_feedback")
                .map((key) => (
                  <SelectItem key={key} value={key}>{t(LABEL_KEYS[key])}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {(expanded || !isAdmin) && !isCompact && (
        <div className="border-t bg-muted/30 p-4">
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
