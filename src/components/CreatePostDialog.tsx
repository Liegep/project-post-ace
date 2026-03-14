import { useState, useRef } from "react";
import { usePosts } from "@/context/PostsContext";
import { useI18n } from "@/i18n/I18nContext";
import { PostStatus, MediaType } from "@/types/post";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_CONFIG } from "@/types/post";
import { ImagePlus, X, Video } from "lucide-react";
import { TagSelector } from "@/components/TagSelector";

const STATUS_KEYS = {
  em_desenvolvimento: "statusInDevelopment",
  escrevendo_legenda: "statusWritingCaption",
  pronto: "statusReady",
} as const;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreatePostDialog = ({ open, onOpenChange }: CreatePostDialogProps) => {
  const { addPost, uploadMedia } = usePosts();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [caption, setCaption] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<PostStatus>("em_desenvolvimento");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");
    pendingFileRef.current = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageUrl("");
    setImagePreview("");
    pendingFileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || (!imagePreview && !imageUrl) || !caption || !deadline) return;

    setUploading(true);
    try {
      let finalUrl = imageUrl;
      if (pendingFileRef.current) {
        finalUrl = await uploadMedia(pendingFileRef.current);
      }

      await addPost({
        title,
        imageUrl: finalUrl,
        mediaType,
        caption,
        deadline: new Date(deadline),
        status,
        tags: selectedTags,
      });

      setTitle("");
      clearImage();
      setCaption("");
      setDeadline("");
      setStatus("em_desenvolvimento");
      setSelectedTags([]);
      onOpenChange(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative mt-1 rounded-lg border overflow-hidden" style={{ aspectRatio: "4/5" }}>
                {mediaType === "video" ? (
                  <video src={imagePreview} className="h-full w-full object-cover" controls muted />
                ) : (
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 rounded-full bg-background/80 p-1 hover:bg-background"
                >
                  <X className="h-4 w-4" />
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
            <Label htmlFor="caption">{t("caption")}</Label>
            <Textarea id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={t("captionPlaceholder")} className="min-h-[100px]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deadline">{t("deadline")}</Label>
              <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
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
            {uploading ? "..." : t("createPost")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
