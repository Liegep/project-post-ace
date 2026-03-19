import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Paperclip, Link, X, StickyNote, ImagePlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nContext";
import { format } from "date-fns";

const NOTE_COLORS = [
  "#fef08a", // yellow
  "#bbf7d0", // green
  "#bfdbfe", // blue
  "#fecaca", // red
  "#e9d5ff", // purple
  "#fed7aa", // orange
  "#fbcfe8", // pink
  "#ccfbf1", // teal
];

interface Attachment {
  type: "link" | "image" | "video";
  url: string;
  name: string;
}

interface ClientNote {
  id: string;
  client_id: string;
  user_id: string;
  title: string;
  content: string;
  color: string;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
  author_name?: string;
}

interface ClientNotesProps {
  clientId: string;
  onCountChange?: (count: number) => void;
}

export const ClientNotes = ({ clientId }: ClientNotesProps) => {
  const { t } = useI18n();
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("client_notes" as any)
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return;
    }

    // Fetch author names
    const userIds = [...new Set((data as any[]).map((n: any) => n.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p.full_name]) ?? []);

    setNotes(
      (data as any[]).map((n: any) => ({
        ...n,
        attachments: Array.isArray(n.attachments) ? n.attachments : JSON.parse(n.attachments || "[]"),
        author_name: profileMap.get(n.user_id) || "Usuário",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, [clientId]);

  const handleAddLink = () => {
    if (!linkUrl.trim()) return;
    setAttachments((prev) => [...prev, { type: "link", url: linkUrl.trim(), name: linkUrl.trim() }]);
    setLinkUrl("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `notes/${clientId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("media").upload(path, file);
      if (error) {
        toast({ title: "Erro ao enviar arquivo", variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      const isVideo = file.type.startsWith("video/");
      setAttachments((prev) => [
        ...prev,
        { type: isVideo ? "video" : "image", url: urlData.publicUrl, name: file.name },
      ]);
    }
    setUploading(false);
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("client_notes" as any).insert({
      client_id: clientId,
      user_id: user.id,
      title: title.trim() || "Nota",
      content: content.trim(),
      color,
      attachments: JSON.stringify(attachments),
    } as any);

    if (error) {
      toast({ title: "Erro ao criar nota", variant: "destructive" });
      return;
    }

    toast({ title: t("noteCreated") });
    setTitle("");
    setContent("");
    setColor(NOTE_COLORS[0]);
    setAttachments([]);
    setCreateOpen(false);
    fetchNotes();
  };

  const handleDelete = async (noteId: string) => {
    await supabase.from("client_notes" as any).delete().eq("id", noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    toast({ title: t("noteDeleted") });
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold">{t("clientNotes")}</h2>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t("newNote")}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">{t("noNotes")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl p-4 shadow-sm border border-black/5 relative group transition-shadow hover:shadow-md"
              style={{ backgroundColor: note.color }}
            >
              <button
                onClick={() => handleDelete(note.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-black/10"
              >
                <Trash2 className="h-3.5 w-3.5 text-gray-600" />
              </button>

              {note.title && (
                <h3 className="font-semibold text-sm text-gray-800 mb-1 pr-6">{note.title}</h3>
              )}
              {note.content && (
                <p className="text-xs text-gray-700 whitespace-pre-wrap mb-2">{note.content}</p>
              )}

              {note.attachments.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {note.attachments.map((att, i) => (
                    <div key={i}>
                      {att.type === "link" ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-700 hover:underline truncate"
                        >
                          <Link className="h-3 w-3 shrink-0" />
                          <span className="truncate">{att.name}</span>
                        </a>
                      ) : att.type === "image" ? (
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={att.url}
                            alt={att.name}
                            className="rounded-md max-h-24 w-full object-cover"
                          />
                        </a>
                      ) : (
                        <video src={att.url} controls className="rounded-md max-h-24 w-full" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                <span>{note.author_name}</span>
                <span>{format(new Date(note.created_at), "dd/MM/yy HH:mm")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Note Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-amber-500" />
              {t("newNote")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder={t("noteTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              placeholder={t("noteContent")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
            />

            {/* Color picker */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("noteColor")}</label>
              <div className="flex gap-2 flex-wrap">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            {/* Add link */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("noteAddLink")}</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                  className="text-sm"
                />
                <Button size="sm" variant="outline" onClick={handleAddLink} disabled={!linkUrl.trim()}>
                  <Link className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* File upload */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("noteAddMedia")}</label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-primary hover:underline">
                <ImagePlus className="h-4 w-4" />
                {uploading ? "Enviando..." : t("noteSelectFile")}
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 text-sm">
                    {att.type === "link" ? (
                      <Link className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                    ) : att.type === "image" ? (
                      <img src={att.url} className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span className="truncate flex-1 text-xs">{att.name}</span>
                    <button onClick={() => removeAttachment(i)}>
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleCreate} disabled={!title.trim() && !content.trim()} className="w-full">
              {t("createNote")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
