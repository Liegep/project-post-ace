import { useState, useRef } from "react";
import { usePosts } from "@/context/PostsContext";
import { useI18n } from "@/i18n/I18nContext";
import { HashtagManager } from "@/components/HashtagManager";
import { PostStatus, MediaType } from "@/types/post";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagSelector } from "@/components/TagSelector";
import { SortableMediaGrid, SortableMediaItem } from "@/components/SortableMediaGrid";

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultColumnId?: string | null;
}

let mediaIdCounter = 0;

export const CreatePostDialog = ({ open, onOpenChange, defaultColumnId }: CreatePostDialogProps) => {
  const { addPost, uploadMedia, columns, clientId } = usePosts();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [mediaItems, setMediaItems] = useState<SortableMediaItem[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<PostStatus>("entrada");
  const [columnId, setColumnId] = useState<string | null>(defaultColumnId ?? null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) setColumnId(defaultColumnId ?? null);
    onOpenChange(isOpen);
  };

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
    if (!title) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const mp of mediaItems) {
        if (mp.file) {
          const url = await uploadMedia(mp.file);
          uploadedUrls.push(url);
        }
      }

      await addPost({
        title,
        imageUrl: uploadedUrls[coverIndex] || uploadedUrls[0] || "",
        mediaType: mediaItems[coverIndex]?.type || mediaItems[0]?.type || "image",
        mediaUrls: uploadedUrls,
        caption,
        deadline: deadline ? new Date(deadline) : undefined,
        status,
        tags: selectedTags,
        columnId,
      });

      setTitle("");
      setMediaItems([]);
      setCoverIndex(0);
      setCaption("");
      setDeadline("");
      setStatus("entrada");
      setColumnId(null);
      setSelectedTags([]);
      handleOpenChange(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("createNewPost")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">{t("title")}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} />
          </div>
          <div>
            <Label>{t("media")}</Label>
            <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />
            <SortableMediaGrid
              items={mediaItems}
              coverIndex={coverIndex}
              onReorder={setMediaItems}
              onRemove={removeMedia}
              onSetCover={setCoverIndex}
              onAddMore={() => fileInputRef.current?.click()}
              emptyLabel={t("clickToSelectMedia")}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="caption">{t("caption")}</Label>
              <HashtagManager clientId={clientId} onInsert={(h) => setCaption((prev) => prev ? `${prev}\n\n${h}` : h)} />
            </div>
            <Textarea id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t("captionPlaceholder")} className="min-h-[100px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deadline">{t("deadline")}</Label>
              <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div>
              <Label>Coluna</Label>
              <Select value={columnId ?? "none"} onValueChange={(v) => setColumnId(v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem coluna</SelectItem>
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
          <Button type="submit" disabled={uploading} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {uploading ? "..." : t("createPost")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
