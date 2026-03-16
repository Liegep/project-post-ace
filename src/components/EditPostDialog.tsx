import { useState, useRef, useEffect } from "react";
import { usePosts } from "@/context/PostsContext";
import { useI18n } from "@/i18n/I18nContext";
import { Post, PostStatus, MediaType } from "@/types/post";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, X, Save } from "lucide-react";
import { TagSelector } from "@/components/TagSelector";
import { format } from "date-fns";

const STATUS_KEYS = {
  entrada: "statusEntry",
  em_desenvolvimento: "statusInDevelopment",
  escrevendo_legenda: "statusWritingCaption",
  pronto: "statusReady",
} as const;

interface MediaItem {
  url: string;
  type: MediaType;
  file?: File;
}

interface EditPostDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditPostDialog = ({ post, open, onOpenChange }: EditPostDialogProps) => {
  const { updatePost, updatePostStatus, uploadMedia } = usePosts();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<PostStatus>("em_desenvolvimento");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      const urls = post.mediaUrls.length > 0 ? post.mediaUrls : post.imageUrl ? [post.imageUrl] : [];
      setMediaItems(urls.map((url) => ({
        url,
        type: url.match(/\.(mp4|webm|mov|avi)/i) ? "video" as MediaType : "image" as MediaType,
      })));
      setCaption(post.caption);
      setDeadline(format(post.deadline, "yyyy-MM-dd"));
      setStatus(post.status);
      setSelectedTags(post.tags);
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
          { url: ev.target?.result as string, type: isVideo ? "video" : "image", file },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !title) return;

    setUploading(true);
    try {
      const finalUrls: string[] = [];
      for (const item of mediaItems) {
        if (item.file) {
          const url = await uploadMedia(item.file);
          finalUrls.push(url);
        } else {
          finalUrls.push(item.url);
        }
      }

      await updatePost(post.id, {
        title,
        imageUrl: finalUrls[0] || "",
        mediaType: mediaItems[0]?.type || "image",
        mediaUrls: finalUrls,
        caption,
        deadline: new Date(deadline),
        tags: selectedTags,
      });
      await updatePostStatus(post.id, status);
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            {mediaItems.length > 0 ? (
              <div className="mt-1 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {mediaItems.map((item, i) => (
                    <div key={i} className="relative rounded-lg border overflow-hidden aspect-square">
                      {item.type === "video" ? (
                        <video src={item.url} className="h-full w-full object-cover" muted />
                      ) : (
                        <img src={item.url} alt="Preview" className="h-full w-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 hover:bg-background"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-3 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  <ImagePlus className="h-4 w-4" />
                  Adicionar mais
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-8 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <ImagePlus className="h-5 w-5" />
                {t("clickToSelectMedia")}
              </button>
            )}
          </div>
          <div>
            <Label htmlFor="edit-caption">{t("caption")}</Label>
            <Textarea id="edit-caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t("captionPlaceholder")} className="min-h-[100px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-deadline">{t("deadline")}</Label>
              <Input id="edit-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div>
              <Label>{t("status")}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PostStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_KEYS) as PostStatus[]).map((key) => (
                    <SelectItem key={key} value={key}>{t(STATUS_KEYS[key])}</SelectItem>
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
            <Save className="mr-2 h-4 w-4" /> {uploading ? "..." : t("saveChanges")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
