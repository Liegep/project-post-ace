import { memo, useState } from "react";
import { Post, PostStatus, ClientLabel, STATUS_CONFIG, LABEL_CONFIG, TAG_TRANSLATION_KEYS } from "@/types/post";
import { usePosts } from "@/context/PostsContext";
import { useI18n } from "@/i18n/I18nContext";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuCheckboxItem,
} from "@/components/ui/context-menu";
import { LinkedText } from "@/components/LinkedText";
import { MediaLightbox } from "@/components/MediaLightbox";
import { Archive, Calendar, Copy, Download, Pencil, Play, Send, SendHorizontal, Tag as TagIcon, Trash2, X, Check, ListChecks } from "lucide-react";
import { SendPostToClientDialog } from "@/components/SendPostToClientDialog";
import { format } from "date-fns";
import { isExternalLink } from "@/components/ExternalLinkCard";
import { getContrastColor } from "@/lib/utils";
import { toast } from "sonner";

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
  onArchive?: () => void;
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
    onDelete,
    onArchive,
    selectionMode,
    isSelected,
    onToggleSelect,
    showInlineDetails,
    allowEditCaption,
  }: PostCardProps) => {
    const { tags, updateClientLabel, addComment, updatePost, addPost, updatePostStatus, clientId } = usePosts();
    const { t } = useI18n();
    const [commentText, setCommentText] = useState("");
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [captionDrawerOpen, setCaptionDrawerOpen] = useState(false);
    const [editingCaption, setEditingCaption] = useState(false);
    const [draftCaption, setDraftCaption] = useState(post.caption);
    const [savingCaption, setSavingCaption] = useState(false);
    const [sendDialogOpen, setSendDialogOpen] = useState(false);

    const allMedia = post.mediaUrls.length > 0 ? post.mediaUrls : post.imageUrl ? [post.imageUrl] : [];
    const hasMedia = allMedia.length > 0;
    const thumbUrl = allMedia[0];
    const FALLBACK_CONFIG = { label: "—", color: "bg-muted text-muted-foreground" };
    const labelConfig = LABEL_CONFIG[post.clientLabel] ?? FALLBACK_CONFIG;
    const getStatusConfig = (s: PostStatus) => STATUS_CONFIG[s] ?? FALLBACK_CONFIG;
    const isOverdue = post.deadline ? new Date() > post.deadline && !post.status.includes("pronto") : false;

    // Cor customizada vinda da automação "Mudar cor do card" (formato: "color:#hex")
    const customColor = typeof post.clientLabel === "string" && post.clientLabel.startsWith("color:")
      ? post.clientLabel.slice(6)
      : null;

    const postTags = post.tags
      .map((tagId) => tags.find((t) => t.id === tagId))
      .filter(Boolean);

    const ALL_STATUSES: PostStatus[] = ["entrada", "em_desenvolvimento", "escrevendo_legenda", "pronto", "finalizado", "alteracao_solicitada", "agendado"];

    const handleToggleStatus = (s: PostStatus) => {
      const next = post.status.includes(s)
        ? post.status.filter((x) => x !== s)
        : [...post.status, s];
      updatePostStatus(post.id, next);
    };

    const handleToggleTag = (tagId: string) => {
      const next = post.tags.includes(tagId)
        ? post.tags.filter((x) => x !== tagId)
        : [...post.tags, tagId];
      updatePost(post.id, { tags: next });
    };

    const handleDuplicate = async () => {
      const ok = await addPost({
        title: `${post.title} (cópia)`,
        imageUrl: post.imageUrl,
        mediaType: post.mediaType,
        mediaUrls: post.mediaUrls,
        caption: post.caption,
        status: post.status,
        tags: post.tags,
        columnId: post.columnId,
        deadline: post.deadline ?? undefined,
      } as any);
      toast[ok ? "success" : "error"](ok ? "Card duplicado" : "Erro ao duplicar");
    };

    const cardEl = (
      <Card
        className={`overflow-hidden transition-all duration-150 hover:shadow-md hover:translate-y-[-1px] cursor-pointer group ${
          selectionMode && isSelected ? "ring-2 ring-accent shadow-lg" : ""
        }`}
        style={customColor ? { borderColor: customColor, borderWidth: 2, boxShadow: `0 0 0 1px ${customColor}40` } : undefined}
        onClick={() => (selectionMode ? onToggleSelect?.(post.id) : onEdit?.())}
      >
        {/* Title above thumbnail */}
        {/* Title above thumbnail */}
        <div className="bg-muted/40 px-2.5 pt-2 pb-1.5 flex items-start gap-1.5">
          {selectionMode && (
            <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={isSelected} onCheckedChange={() => onToggleSelect?.(post.id)} />
            </div>
          )}
          <h3 className="text-sm font-bold leading-snug text-foreground break-words flex-1">
            {post.title}
          </h3>
          {isAdmin && (
            <div className="flex items-center gap-0.5 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {hasMedia && (
                <button
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = allMedia[0];
                    if (!url || isExternalLink(url)) return;
                    fetch(url)
                      .then((res) => res.blob())
                      .then((blob) => {
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = post.title || "download";
                        a.click();
                        URL.revokeObjectURL(a.href);
                      });
                  }}
                  title="Baixar imagem"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

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
                  <span key={s} className={`inline-flex rounded px-1.5 py-0.5 text-[8px] font-bold ${getStatusConfig(s).color}`}>
                    {t((STATUS_KEYS[s] ?? "statusEntrada") as any)}
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
                <span key={s} className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold ${getStatusConfig(s).color}`}>
                  {t((STATUS_KEYS[s] ?? "statusEntrada") as any)}
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
              {/* Caption preview + Read More */}
              {post.caption && (
                <div className="space-y-1.5">
                  <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed line-clamp-3">
                    <LinkedText text={post.caption} />
                  </div>
                  {post.caption.length > 120 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCaptionDrawerOpen(true); }}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      {t("readMore")}
                    </button>
                  )}
                </div>
              )}

              {/* Feedback dropdown */}
              <Select value={post.clientLabel === "pendente" ? "" : post.clientLabel} onValueChange={(v) => updateClientLabel(post.id, v as ClientLabel)}>
                <SelectTrigger className="h-10 w-full text-sm">
                  <SelectValue placeholder={t("labelGiveFeedback")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de_seu_feedback">💬 {t("labelGiveFeedback")}</SelectItem>
                  <SelectItem value="aprovado">✅ {t("labelApproved")}</SelectItem>
                  <SelectItem value="alteracao_solicitada">✏️ {t("labelChangeRequested")}</SelectItem>
                </SelectContent>
              </Select>

              {/* Comment field */}
              <div className="flex gap-1.5">
                <Textarea
                  placeholder={t("writeComment")}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[40px] text-sm resize-none flex-1 bg-white text-black"
                  rows={1}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => {
                    if (!commentText.trim()) return;
                    addComment(post.id, "Cliente", commentText.trim());
                    setCommentText("");
                  }}
                  disabled={!commentText.trim()}
                >
                  <Send className="h-4 w-4" />
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

        {/* Glassmorphism caption drawer */}
        {post.caption && (
          <Drawer
            open={captionDrawerOpen}
            repositionInputs={false}
            onOpenChange={(open) => {
              setCaptionDrawerOpen(open);
              if (!open) {
                setEditingCaption(false);
                setDraftCaption(post.caption);
              }
            }}
          >
            <DrawerContent
              className="bg-[hsl(0_0%_10%/0.85)] backdrop-blur-2xl border-white/10 text-white max-h-[90vh] flex flex-col"
              style={{ maxHeight: "92dvh" }}
              onClick={(e) => e.stopPropagation()}
            >
              <DrawerHeader className="text-left flex-row items-center justify-between gap-2 pr-4 shrink-0">
                <DrawerTitle className="text-white text-lg flex-1 truncate">{post.title}</DrawerTitle>
                {allowEditCaption && !editingCaption && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftCaption(post.caption);
                      setEditingCaption(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-2 transition-colors shrink-0"
                    title={t("editPost")}
                    aria-label={t("editPost")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("editPost")}
                  </button>
                )}
              </DrawerHeader>
              <div className="px-4 flex-1 overflow-y-auto overscroll-contain min-h-0">
                {editingCaption ? (
                  <div className="rounded-xl bg-white text-black p-4 sm:p-5 shadow-sm">
                    <Textarea
                      value={draftCaption}
                      onChange={(e) => setDraftCaption(e.target.value)}
                      className="min-h-[220px] w-full resize-none border-0 bg-transparent p-0 text-[18px] leading-[1.6] text-black shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl bg-white text-black p-4 sm:p-5 text-[18px] leading-[1.6] whitespace-pre-wrap font-medium">
                    <LinkedText text={post.caption} />
                  </div>
                )}
              </div>
              {editingCaption && (
                <div className="sticky bottom-0 shrink-0 flex gap-2 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] border-t border-white/10 bg-[hsl(0_0%_10%/0.95)] backdrop-blur-2xl">
                  <Button
                    size="lg"
                    className="h-12 text-base font-semibold flex-1 gap-2"
                    disabled={savingCaption || draftCaption === post.caption}
                    onClick={async () => {
                      setSavingCaption(true);
                      try {
                        await updatePost(post.id, { caption: draftCaption });
                        setEditingCaption(false);
                        setCaptionDrawerOpen(false);
                      } finally {
                        setSavingCaption(false);
                      }
                    }}
                  >
                    <Check className="h-4 w-4" />
                    {savingCaption ? t("saving") : t("save")}
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-12 text-base text-white hover:bg-white/10 gap-2"
                    disabled={savingCaption}
                    onClick={() => {
                      setEditingCaption(false);
                      setDraftCaption(post.caption);
                    }}
                  >
                    <X className="h-4 w-4" />
                    {t("cancel")}
                  </Button>
                </div>
              )}
            </DrawerContent>
          </Drawer>
        )}
      </Card>
    );

    if (!isAdmin) return cardEl;

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="block">
            {cardEl}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent
          className="w-56"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <ListChecks className="h-4 w-4 mr-2" />
              Status
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              {ALL_STATUSES.map((s) => (
                <ContextMenuCheckboxItem
                  key={s}
                  checked={post.status.includes(s)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onSelect={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleStatus(s);
                  }}
                >
                  {t((STATUS_KEYS[s] ?? "statusEntrada") as any)}
                </ContextMenuCheckboxItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <TagIcon className="h-4 w-4 mr-2" />
              Etiquetas
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56 max-h-72 overflow-y-auto" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              {tags.length === 0 ? (
                <ContextMenuItem disabled>Nenhuma etiqueta</ContextMenuItem>
              ) : (
                tags.map((tag) => (
                  <ContextMenuCheckboxItem
                    key={tag.id}
                    checked={post.tags.includes(tag.id)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onSelect={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleTag(tag.id);
                    }}
                  >
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full mr-2"
                      style={{ backgroundColor: tag.color }}
                    />
                    {TAG_TRANSLATION_KEYS[tag.id] ? t(TAG_TRANSLATION_KEYS[tag.id] as any) : tag.name}
                  </ContextMenuCheckboxItem>
                ))
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator />

          <ContextMenuItem onSelect={handleDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar card
          </ContextMenuItem>

          <ContextMenuItem onSelect={() => setSendDialogOpen(true)}>
            <SendHorizontal className="h-4 w-4 mr-2" />
            Enviar para outro cliente
          </ContextMenuItem>

          {onArchive && (
            <ContextMenuItem onSelect={() => onArchive()}>
              <Archive className="h-4 w-4 mr-2" />
              Arquivar
            </ContextMenuItem>
          )}

          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => onDelete()} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
        {post.columnId !== undefined && (
          <SendPostToClientDialog
            open={sendDialogOpen}
            onOpenChange={setSendDialogOpen}
            post={post}
            currentClientId={(post as any).clientId ?? ""}
          />
        )}
      </ContextMenu>
    );
  },
);

PostCard.displayName = "PostCard";
