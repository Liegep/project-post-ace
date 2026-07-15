import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTextContents, TextContent, TextContentType, TextContentStatus } from "@/hooks/useTextContents";
import { TextContentCard } from "@/components/TextContentCard";
import { TextContentDetailDialog } from "@/components/TextContentDetailDialog";
import { CreateTextContentDialog } from "@/components/CreateTextContentDialog";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  clientId: string;
  clientName?: string;
  isAdmin?: boolean;
  locale?: string;
}

type LocaleKey = "pt" | "en" | "it" | "es" | "sv";
const TC_T: Record<LocaleKey, {
  title: string; new: string; empty: string; contentApproved: string; contentRejected: string;
  createdSuccess: string; createError: string; updated: string; deleted: string; deleteConfirm: string;
  commentSent: string;
}> = {
  pt: { title: "Conteúdos Textuais", new: "Novo", empty: "Nenhum conteúdo textual para aprovação", contentApproved: "Conteúdo aprovado!", contentRejected: "Conteúdo reprovado", createdSuccess: "Conteúdo criado com sucesso!", createError: "Erro ao criar conteúdo", updated: "Conteúdo atualizado!", deleted: "Conteúdo excluído", deleteConfirm: "Excluir este conteúdo?", commentSent: "Comentário enviado!" },
  en: { title: "Text Contents", new: "New", empty: "No text content for approval", contentApproved: "Content approved!", contentRejected: "Content rejected", createdSuccess: "Content created!", createError: "Error creating content", updated: "Content updated!", deleted: "Content deleted", deleteConfirm: "Delete this content?", commentSent: "Comment sent!" },
  it: { title: "Contenuti Testuali", new: "Nuovo", empty: "Nessun contenuto testuale da approvare", contentApproved: "Contenuto approvato!", contentRejected: "Contenuto rifiutato", createdSuccess: "Contenuto creato!", createError: "Errore nella creazione", updated: "Contenuto aggiornato!", deleted: "Contenuto eliminato", deleteConfirm: "Eliminare questo contenuto?", commentSent: "Commento inviato!" },
  es: { title: "Contenidos de Texto", new: "Nuevo", empty: "Sin contenido de texto para aprobar", contentApproved: "¡Contenido aprobado!", contentRejected: "Contenido rechazado", createdSuccess: "¡Contenido creado!", createError: "Error al crear contenido", updated: "¡Contenido actualizado!", deleted: "Contenido eliminado", deleteConfirm: "¿Eliminar este contenido?", commentSent: "¡Comentario enviado!" },
  sv: { title: "Textinnehåll", new: "Nytt", empty: "Inget textinnehåll för godkännande", contentApproved: "Innehåll godkänt!", contentRejected: "Innehåll avvisat", createdSuccess: "Innehåll skapat!", createError: "Fel vid skapande", updated: "Innehåll uppdaterat!", deleted: "Innehåll borttaget", deleteConfirm: "Ta bort detta innehåll?", commentSent: "Kommentar skickad!" },
};

export function TextContentsPanel({ clientId, clientName, isAdmin, locale }: Props) {
  const lk: LocaleKey = ((locale as LocaleKey) in TC_T ? (locale as LocaleKey) : "pt");
  const tt = TC_T[lk];
  const { contents, loading, create, update, remove } = useTextContents(clientId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<TextContent | null>(null);
  const [detailItem, setDetailItem] = useState<TextContent | null>(null);

  const handleCreate = async (data: any) => {
    const result = await create(data);
    if (result) {
      toast({ title: "Conteúdo criado com sucesso!" });
      return true;
    }
    toast({ title: "Erro ao criar conteúdo", variant: "destructive" });
    return false;
  };

  const handleEdit = async (data: any) => {
    if (!editItem) return false;
    const ok = await update(editItem.id, data);
    if (ok) {
      toast({ title: "Conteúdo atualizado!" });
      setEditItem(null);
      // Also update detail if open
      if (detailItem?.id === editItem.id) {
        setDetailItem({ ...editItem, ...data, updated_at: new Date().toISOString() });
      }
      return true;
    }
    return false;
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este conteúdo?")) return;
    await remove(id);
    toast({ title: "Conteúdo excluído" });
  };

  const handleStatusChange = async (id: string, status: string) => {
    const item = contents.find((c) => c.id === id);
    const ok = await update(id, { status: status as TextContentStatus, client_label: status === "approved" ? "aprovado" : status === "rejected" ? "alteracao_solicitada" : "pendente" });
    if (ok) {
      toast({ title: status === "approved" ? "Conteúdo aprovado!" : "Conteúdo reprovado" });
      if (detailItem?.id === id) {
        setDetailItem({ ...detailItem!, status: status as TextContentStatus });
      }
      const actionLabel = status === "approved" ? "aprovou" : "reprovou";
      const title = `Conteúdo textual ${status === "approved" ? "aprovado" : "reprovado"}`;
      const message = `${clientName || "Cliente"} ${actionLabel} o conteúdo "${item?.title || ""}"`;
      const { data: sessionData } = await supabase.auth.getSession();
      let actorAvatar = "";
      if (sessionData?.session?.user?.id) {
        const { data: prof } = await supabase.from("profiles").select("avatar_url").eq("id", sessionData.session.user.id).maybeSingle();
        actorAvatar = (prof as any)?.avatar_url || "";
      }
      await supabase.from("admin_notifications").insert({
        title, message,
        type: status === "approved" ? "text_approved" : "text_rejected",
        client_id: clientId,
        actor_avatar_url: actorAvatar,
      } as any);
    }
  };

  const handleCardComment = async (id: string, msg: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || "anonymous";
    const { error } = await supabase.from("text_content_comments").insert({
      text_content_id: id,
      user_id: userId,
      author_name: clientName || "Cliente",
      author_role: "client",
      message: msg,
    } as any);
    if (!error) toast({ title: "Comentário enviado!" });
  };

  // Filter for client view: hide approved/published
  const visibleContents = isAdmin
    ? contents
    : contents.filter((c) => c.status !== "approved" && c.status !== "published");

  // Hide entire widget for clients when no contents
  if (!isAdmin && !loading && visibleContents.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 rounded-xl border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground">Conteúdos Textuais</h2>
          {visibleContents.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {visibleContents.length}
            </span>
          )}
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo
          </Button>
        )}
      </div>

      {visibleContents.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card/50 p-8 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Nenhum conteúdo textual criado ainda" : "Nenhum conteúdo textual para aprovação"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleContents.map((content) => (
            <div key={content.id} className="relative group">
              <TextContentCard
                content={content}
                onClick={() => setDetailItem(content)}
                isAdmin={isAdmin}
                onApprove={(id) => handleStatusChange(id, "approved")}
                onReject={(id) => handleStatusChange(id, "rejected")}
                onComment={handleCardComment}
              />
              {isAdmin && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); setEditItem(content); }}
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDelete(content.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateTextContentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
      />

      {editItem && (
        <CreateTextContentDialog
          open={!!editItem}
          onOpenChange={(open) => { if (!open) setEditItem(null); }}
          onSave={handleEdit}
          initial={editItem}
          mode="edit"
        />
      )}

      <TextContentDetailDialog
        content={detailItem}
        open={!!detailItem}
        onOpenChange={(open) => { if (!open) setDetailItem(null); }}
        isAdmin={isAdmin}
        clientName={clientName}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
