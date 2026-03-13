import { useState, useRef, useEffect } from "react";
import { usePosts } from "@/context/PostsContext";
import { useI18n } from "@/i18n/I18nContext";
import { Post, PostStatus } from "@/types/post";
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
  em_desenvolvimento: "statusInDevelopment",
  escrevendo_legenda: "statusWritingCaption",
  pronto: "statusReady",
} as const;

interface EditPostDialogProps {
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditPostDialog = ({ post, open, onOpenChange }: EditPostDialogProps) => {
  const { updatePost, updatePostStatus } = usePosts();
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [caption, setCaption] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState<PostStatus>("em_desenvolvimento");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setImageUrl(post.imageUrl);
      setImagePreview(post.imageUrl);
      setCaption(post.caption);
      setDeadline(format(post.deadline, "yyyy-MM-dd"));
      setStatus(post.status);
      setSelectedTags(post.tags);
    }
  }, [post]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImageUrl(dataUrl);
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageUrl("");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !title || !imageUrl || !caption || !deadline) return;

    updatePost(post.id, {
      title,
      imageUrl,
      caption,
      deadline: new Date(deadline),
      tags: selectedTags,
    });
    updatePostStatus(post.id, status);
    onOpenChange(false);
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
            <Label>{t("image")}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative mt-1 rounded-lg border overflow-hidden" style={{ aspectRatio: "4/5" }}>
                <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full bg-background/80 p-1.5 hover:bg-background"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="rounded-full bg-background/80 p-1.5 hover:bg-background"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-8 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
              >
                <ImagePlus className="h-5 w-5" />
                {t("clickToSelectImage")}
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
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Save className="mr-2 h-4 w-4" /> {t("saveChanges")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
