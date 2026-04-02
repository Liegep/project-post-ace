import { useState, useRef, useEffect } from "react";
import { usePosts } from "@/context/PostsContext";

import { useI18n } from "@/i18n/I18nContext";
import { HashtagManager } from "@/components/HashtagManager";
import { Post, PostStatus, MediaType } from "@/types/post";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save, ShieldCheck } from "lucide-react";
import { TagSelector } from "@/components/TagSelector";
import { SortableMediaGrid, SortableMediaItem } from "@/components/SortableMediaGrid";
import { supabase } from "@/integrations/supabase/client";
import { createPostDeadlineFromInput, formatPostDeadlineInput } from "@/lib/postDeadline";

interface EditPostDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

let mediaIdCounter = 0;

export const EditPostDialog = ({ post, open, onOpenChange }: EditPostDialogProps) => {
  const { updatePost, updatePostStatus, uploadMedia, columns, movePostToColumn, clientId } = usePosts();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [mediaItems, setMediaItems] = useState<SortableMediaItem[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<PostStatus[]>(["em_desenvolvimento"]);
  const [columnId, setColumnId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [retainFiles, setRetainFiles] = useState(false);
  const [externalLink, setExternalLink] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      const urls = post.mediaUrls.length > 0 ? post.mediaUrls : post.imageUrl ? [post.imageUrl] : [];
      // Check if the only URL is an external link (not from storage)
      const isExternal = urls.length === 1 && urls[0] && !urls[0].includes("supabase") && (urls[0].startsWith("http://") || urls[0].startsWith("https://"));
      if (isExternal && !urls[0].includes("storage")) {
        setMediaItems([]);
        setExternalLink(urls[0]);
      } else {
        setMediaItems(urls.map((url) => ({
          id: `existing-${mediaIdCounter++}`,
          url,
          type: url.match(/\.(mp4|webm|mov|avi)/i) ? "video" as MediaType : "image" as MediaType,
        })));
        setExternalLink("");
      }
      const coverIdx = post.imageUrl ? urls.indexOf(post.imageUrl) : 0;
      setCoverIndex(coverIdx >= 0 ? coverIdx : 0);
      setCaption(post.caption);
      setDeadline(formatPostDeadlineInput(post.deadline));
      setStatus(Array.isArray(post.status) ? post.status : [post.status]);
      setColumnId(post.columnId);
      setSelectedTags(post.tags);
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
    if (!post || !title) return;

    setUploading(true);
    try {
      let finalUrls: string[] = [];

      if (mediaItems.length === 0 && externalLink.trim()) {
        finalUrls = [externalLink.trim()];
      } else {
        for (const item of mediaItems) {
          if (item.file) {
            const url = await uploadMedia(item.file);
            finalUrls.push(url);
          } else {
            finalUrls.push(item.url);
          }
        }
      }

      await updatePost(post.id, {
        title,
        imageUrl: finalUrls[0] || "",
        mediaType: mediaItems[0]?.type || "image",
        mediaUrls: finalUrls,
        caption,
        deadline: deadline ? createPostDeadlineFromInput(deadline) : null,
        tags: selectedTags,
      });
      // Update retain_files flag
      await supabase.from("posts").update({ retain_files: retainFiles } as any).eq("id", post.id);
      await updatePostStatus(post.id, status);
      if (columnId !== post.columnId) {
        await movePostToColumn(post.id, columnId);
      }


      onOpenChange(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editPost")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-title">{t("title")}</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} />
          </div>
          <div>
            <Label>{t("media")}</Label>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
            <SortableMediaGrid
              items={mediaItems}
              coverIndex={0}
              onReorder={(newItems) => { setMediaItems(newItems); setCoverIndex(0); }}
              onRemove={removeMedia}
              onSetCover={(idx) => {
                // Move the selected item to first position (making it the cover)
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
            <div className="mt-2">
              <Label htmlFor="edit-external-link" className="text-xs text-muted-foreground">Ou usar link</Label>
              <Input
                id="edit-external-link"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                disabled={mediaItems.length > 0}
              />
              {mediaItems.length > 0 && externalLink && (
                <p className="text-xs text-muted-foreground mt-1">Arquivos enviados têm prioridade sobre o link.</p>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="edit-caption">{t("caption")}</Label>
              <HashtagManager clientId={clientId} onInsert={(h) => setCaption((prev) => prev ? `${prev}\n\n${h}` : h)} />
            </div>
            <Textarea id="edit-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t("captionPlaceholder")} className="min-h-[100px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-deadline">{t("deadline")}</Label>
              <Input id="edit-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div>
              <Label>{t("columnLabel")}</Label>
              <Select value={columnId ?? "none"} onValueChange={(v) => setColumnId(v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noColumn")}</SelectItem>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t("tags")}</Label>
            <div className="mt-1">
              <TagSelector selectedTagIds={selectedTags} onChange={setSelectedTags} />
            </div>
          </div>
          {/* Retain files toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Manter arquivos</p>
                <p className="text-[11px] text-muted-foreground">Impede a remoção automática após 30 dias</p>
              </div>
            </div>
            <Switch checked={retainFiles} onCheckedChange={setRetainFiles} />
          </div>
          <Button type="submit" disabled={uploading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Save className="mr-2 h-4 w-4" /> {uploading ? "..." : t("saveChanges")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
