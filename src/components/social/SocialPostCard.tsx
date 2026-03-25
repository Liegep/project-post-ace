import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SocialStatusBadge } from "./SocialStatusBadge";
import { isExternalLink } from "@/components/ExternalLinkCard";
import { Facebook, Instagram, MoreHorizontal, Pencil, Copy, Trash2, Send, Clock, CheckCircle, XCircle, RotateCcw, Film, FileText } from "lucide-react";
import type { SocialPost } from "@/hooks/useSocialPosts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SocialPostCardProps {
  post: SocialPost;
  onEdit: (post: SocialPost) => void;
  onDuplicate: (post: SocialPost) => void;
  onDelete: (id: string) => void;
  onPublishNow: (id: string) => void;
  onSchedule: (post: SocialPost) => void;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}

export function SocialPostCard({ post, onEdit, onDuplicate, onDelete, onPublishNow, onSchedule, onApprove, onCancel, onRetry }: SocialPostCardProps) {
  const PlatformIcon = post.platform === "instagram" ? Instagram : Facebook;
  const platformColor = post.platform === "instagram" ? "text-pink-500" : "text-blue-600";

  return (
    <Card className="group hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-0">
        <div className="flex gap-3 p-4">
          {/* Media preview */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
              {isExternalLink(post.media_urls[0]) ? (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <Film className="h-6 w-6 text-muted-foreground" />
                </div>
              ) : (
                <img src={post.media_urls[0]} alt="" className="w-full h-full object-cover" />
              )}
              {post.media_urls.length > 1 && (
                <div className="relative -mt-6 text-center">
                  <span className="bg-foreground/70 text-background text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    +{post.media_urls.length - 1}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <PlatformIcon className={`h-4 w-4 ${platformColor}`} />
                <span className="text-xs text-muted-foreground">
                  {post.meta_pages?.page_name || "Sem página"}
                  {post.platform === "instagram" && post.meta_pages?.instagram_username && ` (@${post.meta_pages.instagram_username})`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <SocialStatusBadge status={post.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(post)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(post)}>
                      <Copy className="mr-2 h-4 w-4" /> Duplicar
                    </DropdownMenuItem>
                    {post.status === "pending_approval" && (
                      <DropdownMenuItem onClick={() => onApprove(post.id)}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Aprovar
                      </DropdownMenuItem>
                    )}
                    {(post.status === "approved" || post.status === "draft") && (
                      <DropdownMenuItem onClick={() => onSchedule(post)}>
                        <Clock className="mr-2 h-4 w-4" /> Agendar
                      </DropdownMenuItem>
                    )}
                    {(post.status === "approved") && (
                      <DropdownMenuItem onClick={() => onPublishNow(post.id)}>
                        <Send className="mr-2 h-4 w-4" /> Publicar Agora
                      </DropdownMenuItem>
                    )}
                    {(post.status === "scheduled") && (
                      <DropdownMenuItem onClick={() => onCancel(post.id)}>
                        <XCircle className="mr-2 h-4 w-4" /> Cancelar
                      </DropdownMenuItem>
                    )}
                    {post.status === "error" && (
                      <DropdownMenuItem onClick={() => onRetry(post.id)}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Tentar Novamente
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onDelete(post.id)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <p className="text-sm text-foreground line-clamp-2">{post.caption || "(Sem legenda)"}</p>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {post.scheduled_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(post.scheduled_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              )}
              {post.media_type !== "image" && (
                <span className="capitalize rounded bg-muted px-1.5 py-0.5">{post.media_type}</span>
              )}
            </div>

            {post.error_message && (
              <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1 line-clamp-1">
                {post.error_message}
              </p>
            )}

            {post.notes && (
              <p className="text-xs text-muted-foreground italic line-clamp-1">📝 {post.notes}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
