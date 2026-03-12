import { useState } from "react";
import { Post, PostStatus, ClientLabel, STATUS_CONFIG, LABEL_CONFIG } from "@/types/post";
import { usePosts } from "@/context/PostsContext";
import { TagDisplay } from "@/components/TagSelector";
import { TagSelector } from "@/components/TagSelector";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MessageCircle, Trash2, ChevronDown, ChevronUp, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PostCardProps {
  post: Post;
  isAdmin: boolean;
  onStatusChange?: (status: PostStatus) => void;
  onDelete?: () => void;
}

export const PostCard = ({ post, isAdmin, onStatusChange, onDelete }: PostCardProps) => {
  const { addComment, updateClientLabel, updatePost, tags } = usePosts();
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

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      {/* Title - above the image, multi-line like Trello */}
      <div className="p-4 pb-2">
        <h3 className="text-lg font-bold leading-snug text-foreground">{post.title}</h3>
      </div>

      {/* Image with status badge overlay */}
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "4/5" }}>
        <img src={post.imageUrl} alt={post.title} className="h-full w-full object-cover" />
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${labelConfig.color}`}>
            {labelConfig.label}
          </span>
        </div>
      </div>

      <div className="p-4 pt-3 space-y-2">
        {isAdmin ? (
          <TagSelector selectedTagIds={post.tags} onChange={(tagIds) => updatePost(post.id, { tags: tagIds })} />
        ) : (
          <TagDisplay tagIds={post.tags} tags={tags} />
        )}
        <p className="line-clamp-3 text-sm text-muted-foreground">{post.caption}</p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : ""}`}>
            <Calendar className="h-3 w-3" />
            {format(post.deadline, "dd MMM yyyy", { locale: ptBR })}
            {isOverdue && " (atrasado)"}
          </span>
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 hover:text-foreground">
            <MessageCircle className="h-3 w-3" />
            {post.comments.length} comentário{post.comments.length !== 1 ? "s" : ""}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex items-center gap-2 pt-1">
            <Select value={post.status} onValueChange={(v) => onStatusChange?.(v as PostStatus)}>
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Client label control */}
        {!isAdmin && (
          <Select value={post.clientLabel} onValueChange={(v) => updateClientLabel(post.id, v as ClientLabel)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LABEL_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Comments section - always visible for client, expandable for admin */}
      {(expanded || !isAdmin) && (
        <div className="border-t bg-muted/30 p-4">
          <div className="space-y-3">
            {post.comments.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
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
              placeholder="Escreva um comentário..."
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
