import { useState, useRef, useEffect, useCallback } from "react";
import { usePosts } from "@/context/PostsContext";

import { useI18n } from "@/i18n/I18nContext";
import { HashtagManager } from "@/components/HashtagManager";
import { Post, PostStatus, MediaType, STATUS_CONFIG, ClientLabel } from "@/types/post";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { CommentContent } from "@/components/CommentContent";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile, Send as SendIcon, Pencil, Trash2 as CommentTrash, Check, X, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Save, ShieldCheck, ChevronDown, Users, Copy } from "lucide-react";
import { TagSelector } from "@/components/TagSelector";
import { SortableMediaGrid, SortableMediaItem } from "@/components/SortableMediaGrid";
import { ApprovalLinkButton } from "@/components/ApprovalLinkButton";
import { InternalApprovalDialog } from "@/components/InternalApprovalDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { createPostDeadlineFromInput, formatPostDeadlineInput } from "@/lib/postDeadline";
import { ART_TYPES, getArtTypeConfig } from "@/lib/artTypes";
import { BrandBrainSidePanel } from "@/components/BrandBrainSidePanel";
import { useBrandBrain } from "@/hooks/useBrandBrain";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles } from "lucide-react";
import { htmlToPlainText } from "@/lib/htmlToPlain";

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

interface EditPostDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

let mediaIdCounter = 0;

export const EditPostDialog = ({ post, open, onOpenChange }: EditPostDialogProps) => {
  const { updatePost, updatePostStatus, uploadMedia, columns, movePostToColumn, clientId, addComment, deleteComment, updateComment, posts, updateClientLabel, commentAuthors } = usePosts();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [mediaItems, setMediaItems] = useState<SortableMediaItem[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<PostStatus[]>(["em_desenvolvimento"]);
  const [columnId, setColumnId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [artType, setArtType] = useState<string>("single_post");
  const [isPauta, setIsPauta] = useState<boolean>(false);
  const [uploading, setUploading] = useState(false);
  const [retainFiles, setRetainFiles] = useState(false);
  const [externalLink, setExternalLink] = useState("");
  const [contentPillarId, setContentPillarId] = useState<string | null>(null);
  const [brainOpen, setBrainOpen] = useState(false);
  const { pillars } = useBrandBrain(clientId || undefined);
  const [editingLink, setEditingLink] = useState(false);
  const [internalApprovalOpen, setInternalApprovalOpen] = useState(false);
  const [commentHtml, setCommentHtml] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const EMOJI_LIST = ["😀","😂","❤️","👍","👏","🔥","🎉","💡","✅","⭐","🚀","💪","📌","📝","⚡","🎯","💬","🙌","👀","🤔"];

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      const urls = post.mediaUrls.length > 0 ? post.mediaUrls : post.imageUrl ? [post.imageUrl] : [];
      // Separate external links from storage media
      const isStorageUrl = (u: string) => u.includes("supabase") || u.includes("/storage/");
      const externals = urls.filter((u) => u && /^https?:\/\//i.test(u) && !isStorageUrl(u));
      const mediaUrls = urls.filter((u) => u && !externals.includes(u));
      setMediaItems(mediaUrls.map((url) => ({
        id: `existing-${mediaIdCounter++}`,
        url,
        type: url.match(/\.(mp4|webm|mov|avi)/i) ? "video" as MediaType : "image" as MediaType,
      })));
      setExternalLink(externals[0] || "");
      const coverIdx = post.imageUrl ? mediaUrls.indexOf(post.imageUrl) : 0;
      setCoverIndex(coverIdx >= 0 ? coverIdx : 0);
      setCaption(post.caption);
      setDeadline(formatPostDeadlineInput(post.deadline));
      setStatus(Array.isArray(post.status) ? post.status : [post.status]);
      setColumnId(post.columnId);
      setSelectedTags(post.tags);
      setArtType(post.artType || "single_post");
      setContentPillarId(post.contentPillarId ?? null);
      setIsPauta((post as any).isPauta ?? false);
      supabase.from("posts").select("retain_files").eq("id", post.id).maybeSingle().then(({ data }) => {
        setRetainFiles((data as any)?.retain_files ?? false);
      });
    }
  }, [post]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const isVideo = file.type.startsWith("video/");
      const reader = new FileReader();
      reader.onload = (ev) => {
        setMediaItems((prev) => [
          ...prev,
          { id: `new-${mediaIdCounter++}`, url: ev.target?.result as string, type: isVideo ? "video" : "image", file },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
    setCoverIndex((prev) => {
      if (index === prev) return 0;
      if (index < prev) return prev - 1;
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!post) {
      console.warn("[EditPostDialog] Submit aborted: no post");
      return;
    }
    if (!title.trim()) {
      toast({ title: "Título obrigatório", description: "Preencha o título antes de salvar.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      let finalUrls: string[] = [];

      for (const item of mediaItems) {
        if (item.file) {
          const url = await uploadMedia(item.file);
          finalUrls.push(url);
        } else {
          finalUrls.push(item.url);
        }
      }
      const link = externalLink.trim();
      if (link && /^https?:\/\//i.test(link)) {
        finalUrls.push(link);
      }

      await updatePost(post.id, {
        title,
        imageUrl: finalUrls[coverIndex] || finalUrls[0] || "",
        mediaType: mediaItems[0]?.type || "image",
        mediaUrls: finalUrls,
        caption,
        deadline: deadline ? createPostDeadlineFromInput(deadline) : null,
        tags: selectedTags,
        artType,
        contentPillarId,
        isPauta,
      } as any);
      // Update retain_files flag
      await supabase.from("posts").update({ retain_files: retainFiles } as any).eq("id", post.id);
      await updatePostStatus(post.id, status);
      if (columnId !== post.columnId) {
        await movePostToColumn(post.id, columnId);
      }

      toast({ title: "Alterações salvas" });
      onOpenChange(false);
    } catch (err: any) {
      console.error("[EditPostDialog] Save failed:", err);
      toast({
        title: "Erro ao salvar",
        description: err?.message || "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 gap-0 [&_*]:min-w-0 [&_a]:break-all">
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col lg:flex-row">
            {/* LEFT COLUMN — Title + Caption + Media */}
            <div className="flex-1 lg:w-[58%] p-6 space-y-4 border-r border-border">
              <div>

                <Label htmlFor="edit-title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("title")}</Label>
                <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} className="text-lg font-bold mt-1" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label htmlFor="edit-caption" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("caption")}</Label>
                  {caption && (
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(htmlToPlainText(caption)); toast({ title: "Legenda copiada!" }); }}
                      className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-white border border-black/10 text-black hover:bg-white/90 shadow-sm"
                      aria-label="Copiar legenda"
                      title="Copiar legenda"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {mediaItems.length === 0 && !externalLink.trim() ? (
                  <div className="rounded-md border border-input bg-white overflow-hidden">
                    <RichTextEditor content={caption} onChange={setCaption} placeholder={t("captionPlaceholder")} />
                  </div>
                ) : (
                  <Textarea
                    id="edit-caption"
                    value={/<\/?[a-z][\s\S]*>/i.test(caption) ? htmlToPlainText(caption) : caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={t("captionPlaceholder")}
                    className="min-h-[160px] bg-white text-black"
                  />
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("media")}</Label>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
                <div className="mt-1">
                  <SortableMediaGrid
                    items={mediaItems}
                    coverIndex={0}
                    onReorder={(newItems) => { setMediaItems(newItems); setCoverIndex(0); }}
                    onRemove={removeMedia}
                    onSetCover={(idx) => {
                      if (idx === 0) return;
                      const newItems = [...mediaItems];
                      const [moved] = newItems.splice(idx, 1);
                      newItems.unshift(moved);
                      setMediaItems(newItems);
                      setCoverIndex(0);
                    }}
                    onAddMore={() => fileInputRef.current?.click()}
                    emptyLabel={t("clickToSelectMedia")}
                  />
                </div>
                <div className="mt-2 border-primary-foreground text-black bg-transparent">
                  <Label htmlFor="edit-external-link" className="font-medium peer-disabled:cursor-not-allowed text-xs text-primary-foreground opacity-100">Ou usar link externo</Label>
                  {(() => {
                    const link = externalLink.trim();
                    const valid = link && /^https?:\/\//i.test(link);
                    const showInput = editingLink || !valid;
                    if (showInput) {
                      return (
                        <div className="flex gap-2">
                          <Input
                            id="edit-external-link"
                            value={externalLink}
                            onChange={(e) => setExternalLink(e.target.value)}
                            onBlur={() => valid && setEditingLink(false)}
                            placeholder="https://drive.google.com/..."
                            autoFocus={editingLink}
                            className="flex-1 bg-primary text-white placeholder:text-white/60 border-primary focus-visible:ring-white/40"
                          />
                          {valid && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => setEditingLink(false)}
                              title="Confirmar link"
                            >
                              OK
                            </Button>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className="group relative flex items-center gap-2 rounded-md bg-primary text-white px-3 py-2 border border-primary">
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 flex-1 min-w-0 text-sm font-medium hover:underline"
                          title={link}
                        >
                          <ExternalLinkIcon className="h-4 w-4 shrink-0 text-primary-foreground" />
                          <span className="truncate text-primary-foreground">{link}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setEditingLink(true)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/20 text-white"
                          title="Editar link"
                          aria-label="Editar link"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Comments section */}
              {post && (() => {
                const currentPost = posts.find(p => p.id === post.id);
                const comments = currentPost?.comments || [];
                return (
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Comentários ({comments.length})
                    </Label>

                    {/* Existing comments */}
                    {comments.length > 0 && (
                      <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto">
                        {[...comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((c) => {
                          const author = c.userId ? commentAuthors[c.userId] : undefined;
                          const isClient = author?.role === "client" || c.author === "Cliente";
                          const displayName = author?.fullName || c.author;
                          const photoUrl = isClient ? (author?.clientLogoUrl || author?.avatarUrl) : author?.avatarUrl;
                          const initial = (displayName || "?").charAt(0).toUpperCase();
                          const roleLabel = isClient ? "Cliente" : "Admin";
                          return (
                          <div key={c.id} className="rounded-lg border p-2.5 group/comment bg-secondary text-zinc-950">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-7 w-7 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0 border border-border">
                                  {photoUrl ? (
                                    <img src={photoUrl} alt={displayName} className="h-full w-full object-cover" />
                                  ) : (
                                    <span className="text-xs font-semibold text-muted-foreground">{initial}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs font-semibold text-black truncate">{displayName}</span>
                                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide ${isClient ? "bg-info/15 text-info" : "bg-primary/15 text-primary"}`}>
                                    {roleLabel}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-[10px] text-black font-medium">
                                  {c.createdAt.toLocaleDateString("pt-BR")} {c.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {editingCommentId !== c.id && (
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-black/70 hover:text-foreground"
                                      onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.text); }}
                                      title="Editar"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-black/70 hover:text-destructive"
                                      onClick={() => deleteComment(post.id, c.id)}
                                      title="Excluir"
                                    >
                                      <CommentTrash className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {editingCommentId === c.id ? (
                              <div className="mt-1 space-y-1">
                                <div className="rounded bg-white">
                                  <RichTextEditor
                                    content={editingCommentText}
                                    onChange={setEditingCommentText}
                                    placeholder="Editar comentário"
                                    className="[&_.ProseMirror]:text-black [&_.ProseMirror]:min-h-[60px]"
                                  />
                                </div>
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-green-600"
                                    onClick={() => { updateComment(post.id, c.id, editingCommentText); setEditingCommentId(null); }}
                                    title="Salvar"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground"
                                    onClick={() => setEditingCommentId(null)}
                                    title="Cancelar"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <CommentContent text={c.text} className="text-xs text-neutral-950" />
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}

                    {/* New comment with rich text */}
                    <div className="mt-2">
                      <RichTextEditor
                        content={commentHtml}
                        onChange={setCommentHtml}
                        placeholder="Escrever um comentário"
                        className="[&_.prose]:min-h-[80px] [&_.ProseMirror]:text-black"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
                              <Smile className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2" align="start">
                            <div className="grid grid-cols-10 gap-1">
                              {EMOJI_LIST.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg"
                                  onClick={() => {
                                    setCommentHtml((prev) => {
                                      const stripped = prev.replace(/<\/p>$/, "");
                                      return stripped ? `${stripped}${emoji}</p>` : `<p>${emoji}</p>`;
                                    });
                                    setEmojiPickerOpen(false);
                                  }}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 gap-1.5"
                          disabled={!commentHtml || commentHtml === "<p></p>"}
                          onClick={async () => {
                            if (!commentHtml || commentHtml === "<p></p>") return;
                            // Ensure there is actual textual content (not just empty tags)
                            const div = document.createElement("div");
                            div.innerHTML = commentHtml;
                            const plainText = (div.textContent || div.innerText || "").trim();
                            if (!plainText) return;
                            // Store the HTML so rich-text formatting (lists, headings, bold, etc.) is preserved
                            await addComment(post.id, "Admin", commentHtml);
                            setCommentHtml("");
                          }}
                        >
                          <SendIcon className="h-3.5 w-3.5" />
                          Enviar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* MIDDLE COLUMN — Settings */}
            <div className="lg:w-[42%] p-6 space-y-4">
              {/* Brand Brain drawer trigger */}
              <Sheet open={brainOpen} onOpenChange={setBrainOpen}>
                <SheetTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="w-full justify-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Abrir Brand Brain
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" /> Brand Brain do Cliente
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <BrandBrainSidePanel clientId={clientId} highlightedPillarId={contentPillarId} />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Pilar de Conteúdo */}
              {pillars.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Pilar de Conteúdo
                  </Label>
                  <Select value={contentPillarId ?? "none"} onValueChange={(v) => setContentPillarId(v === "none" ? null : v)}>
                    <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Sem pilar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem pilar</SelectItem>
                      {pillars.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Art type dropdown */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo de arte</Label>
                <Select value={artType} onValueChange={setArtType}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue>
                      {(() => {
                        const cfg = getArtTypeConfig(artType);
                        const Icon = cfg.icon;
                        return (
                          <span className="inline-flex items-center gap-2">
                            <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                            {cfg.fallbackLabel}
                          </span>
                        );
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ART_TYPES.map((a) => {
                      const Icon = a.icon;
                      return (
                        <SelectItem key={a.value} value={a.value}>
                          <span className="inline-flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${a.color}`} />
                            {a.fallbackLabel}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* "Esta é uma pauta para aprovar" toggle */}
              <div className={`flex items-start gap-3 rounded-xl border-2 border-dashed p-3 transition-colors ${isPauta ? "border-amber-400 bg-amber-50" : "border-muted bg-muted/30"}`}>
                <input
                  type="checkbox"
                  id="is-pauta-toggle"
                  checked={isPauta}
                  onChange={(e) => setIsPauta(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-amber-500 cursor-pointer"
                />
                <label htmlFor="is-pauta-toggle" className="cursor-pointer flex-1">
                  <span className={`block text-xs font-bold uppercase tracking-wide ${isPauta ? "text-amber-700" : "text-foreground"}`}>
                    Pauta para aprovação
                  </span>
                  <span className="block text-[11px] text-muted-foreground mt-0.5">
                    O cliente verá este card com visual de pauta (ideia/rascunho), não como post final.
                  </span>
                </label>
              </div>

              {/* Status dropdown */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-between mt-1 text-xs h-9">
                      <span>{status.map((s) => t(STATUS_KEYS[s] as any)).join(", ") || "Selecionar"}</span>
                      <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-50 text-primary-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52 p-2" align="start">
                    {(Object.keys(STATUS_CONFIG) as PostStatus[]).map((key) => (
                      <div
                        key={key}
                        role="button"
                        onClick={() => setStatus((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key])}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted cursor-pointer"
                      >
                        <Checkbox checked={status.includes(key)} className="h-3.5 w-3.5 pointer-events-none" />
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${STATUS_CONFIG[key].color}`}>
                          {t(STATUS_KEYS[key] as any)}
                        </span>
                      </div>
                    ))}
                    <div className="my-1 h-px bg-border" />
                    <div
                      role="button"
                      onClick={async () => {
                        if (!post) return;
                        try {
                          await updatePost(post.id, { archived: true, archivedAt: new Date() });
                          toast({ title: "Card arquivado" });
                          onOpenChange(false);
                        } catch (err: any) {
                          toast({ title: "Erro ao arquivar", description: err?.message, variant: "destructive" });
                        }
                      }}
                      className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted cursor-pointer"
                    >
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground">
                        🗄️ Arquivar
                      </span>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Client Feedback dropdown (admin can reset to pending) */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Feedback do Cliente
                </Label>
                <Select
                  value={post?.clientLabel ?? "pendente"}
                  onValueChange={(v) => post && updateClientLabel(post.id, v as ClientLabel)}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">⏳ Pendente (resetar)</SelectItem>
                    <SelectItem value="de_seu_feedback">💬 Aguardando Feedback</SelectItem>
                    <SelectItem value="aprovado">✅ Aprovado</SelectItem>
                    <SelectItem value="alteracao_solicitada">✏️ Alteração Solicitada</SelectItem>
                    <SelectItem value="leia_comentario">📩 Leia Comentário</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-deadline" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("deadline")}</Label>
                <Input id="edit-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("columnLabel")}</Label>
                <Select value={columnId ?? "none"} onValueChange={(v) => setColumnId(v === "none" ? null : v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noColumn")}</SelectItem>
                    {columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("tags")}</Label>
                <div className="mt-1">
                  <TagSelector selectedTagIds={selectedTags} onChange={setSelectedTags} />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hashtags</Label>
                <div className="mt-1">
                  <HashtagManager clientId={clientId} onInsert={(h) => setCaption((prev) => prev ? `${prev}\n\n${h}` : h)} />
                </div>
              </div>

              {/* Approval & Internal actions */}
              {post && (
                <div className="space-y-2">
                  <ApprovalLinkButton postId={post.id} clientId={clientId} postTitle={post.title} className="w-full justify-start gap-2 text-xs border" />
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => setInternalApprovalOpen(true)}>
                    <Users className="h-3.5 w-3.5" />
                    Aprovação Interna
                  </Button>
                </div>
              )}

              {/* Retain files toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Manter arquivos</p>
                    <p className="text-[11px] text-muted-foreground">Impede remoção automática</p>
                  </div>
                </div>
                <Switch checked={retainFiles} onCheckedChange={setRetainFiles} />
              </div>

              <Button type="submit" disabled={uploading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Save className="mr-2 h-4 w-4" /> {uploading ? "..." : t("saveChanges")}
              </Button>
            </div>

          </div>
        </form>

        {post && (
          <InternalApprovalDialog
            open={internalApprovalOpen}
            onOpenChange={setInternalApprovalOpen}
            postId={post.id}
            postTitle={post.title}
            clientId={clientId}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
