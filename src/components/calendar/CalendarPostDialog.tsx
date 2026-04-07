import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarPost, CalendarPostStatus, STATUS_CONFIG } from "@/hooks/useCalendarPosts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ImagePlus, Trash2, X } from "lucide-react";

interface Client {
  id: string;
  name: string;
}

export interface CalendarPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: CalendarPost | null;
  onSave: (data: Partial<CalendarPost>) => Promise<{ error: any }>;
  onDelete?: (id: string) => Promise<{ error: any }>;
  defaultDate?: string;
  defaultClientId?: string;
}

export function CalendarPostDialog({ open, onOpenChange, post, onSave, onDelete, defaultDate, defaultClientId }: CalendarPostDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [clientId, setClientId] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [publishTime, setPublishTime] = useState("09:00");
  const [status, setStatus] = useState<CalendarPostStatus>("draft");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaType, setMediaType] = useState("image");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("clients").select("id, name").order("name").then(({ data }) => {
      setClients((data as Client[]) || []);
    });
  }, []);

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setCaption(post.caption);
      setClientId(post.client_id);
      setPublishDate(post.publish_date);
      setPublishTime(post.publish_time?.slice(0, 5) || "09:00");
      setStatus(post.status);
      setMediaUrls(post.media_urls || []);
      setMediaType(post.media_type || "image");
    } else {
      setTitle("");
      setCaption("");
      setClientId(defaultClientId || "");
      setPublishDate(defaultDate || new Date().toISOString().split("T")[0]);
      setPublishTime("09:00");
      setStatus("draft");
      setMediaUrls([]);
      setMediaType("image");
    }
  }, [post, defaultDate, open]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    const newUrls: string[] = [];
    const { compressImage } = await import("@/lib/imageCompressor");
    for (const rawFile of Array.from(files)) {
      const file = await compressImage(rawFile);
      const ext = file.name.split(".").pop();
      const path = `calendar/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
        if (file.type.startsWith("video")) setMediaType("video");
      }
    }
    setMediaUrls((prev) => [...prev, ...newUrls]);
    setUploading(false);
  };

  const removeMedia = (idx: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!title.trim() || !clientId || !publishDate) {
      toast({ title: "Preencha título, cliente e data", variant: "destructive" });
      return;
    }
    setSaving(true);
    const data: Partial<CalendarPost> = {
      title: title.trim(),
      caption,
      client_id: clientId,
      publish_date: publishDate,
      publish_time: publishTime,
      status,
      media_urls: mediaUrls,
      media_type: mediaType,
    };
    if (post) (data as any).id = post.id;
    const { error } = await onSave(data);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: post ? "Post atualizado" : "Post criado" });
      onOpenChange(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !onDelete) return;
    if (!confirm("Excluir este post?")) return;
    const { error } = await onDelete(post.id);
    if (!error) {
      toast({ title: "Post excluído" });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">{post ? "Editar Post" : "Novo Post"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-white/80">Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do post" />
          </div>
          <div>
            <Label className="text-white/80">Legenda</Label>
            <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} placeholder="Texto da legenda..." />
          </div>
          <div>
            <Label className="text-white/80">Cliente *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
                <Label className="text-white/80">Data de Publicação *</Label>
              <Input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
            </div>
            <div>
                <Label className="text-white/80">Horário</Label>
              <Input type="time" value={publishTime} onChange={(e) => setPublishTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-white/80">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as CalendarPostStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_CONFIG) as CalendarPostStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${STATUS_CONFIG[s].dotClass}`} />
                      {STATUS_CONFIG[s].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white/80">Mídia</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {mediaUrls.map((url, i) => (
                <div key={i} className="relative group w-20 h-20 rounded-md overflow-hidden border">
                  {mediaType === "video" ? (
                    <video src={url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex items-center justify-center w-20 h-20 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors">
                <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} />
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
              </label>
            </div>
            {uploading && <p className="text-xs text-white/50 mt-1">Enviando...</p>}
          </div>
          <div className="flex justify-between pt-2 border-t border-white/15">
            <div>
              {post && onDelete && (
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="mr-1 h-4 w-4" /> Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
