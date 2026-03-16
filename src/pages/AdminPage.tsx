import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PostsProvider, usePosts } from "@/context/PostsContext";
import { Post, PostStatus } from "@/types/post";
import { PostCard } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { EditPostDialog } from "@/components/EditPostDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LayoutGrid, List, Pencil, ImagePlus, ArrowLeft, Trash2, GripVertical, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent, useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const UNASSIGNED_COLUMN_ID = "__unassigned__";

const DroppableColumn = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`space-y-3 min-h-[60px] rounded-lg transition-colors ${isOver ? "bg-accent/10 ring-2 ring-accent/30" : ""}`}>
      {children}
    </div>
  );
};

const DraggablePostCard = ({ post, onStatusChange, onDelete, onEdit }: {
  post: Post;
  onStatusChange: (s: PostStatus) => void;
  onDelete: () => void;
  onEdit: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
    data: { type: "post", post },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <PostCard
        post={post}
        isAdmin
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </div>
  );
};
interface ClientData {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  locale: string;
  posting_period: string;
  trello_board_id: string;
}

const AdminPageInner = ({ clientData }: { clientData: ClientData }) => {
  const {
    posts, columns, updatePostStatus, deletePost, postingPeriod, setPostingPeriod,
    companyLogo, setCompanyLogo, uploadMedia, addColumn, renameColumn, deleteColumn,
    movePostToColumn,
  } = usePosts();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [createOpen, setCreateOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [periodDraft, setPeriodDraft] = useState(postingPeriod);
  const periodInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const newColumnInputRef = useRef<HTMLInputElement>(null);
  const editColumnInputRef = useRef<HTMLInputElement>(null);
  const [createInColumnId, setCreateInColumnId] = useState<string | null>(null);
  const [trelloSyncOpen, setTrelloSyncOpen] = useState(false);
  const [trelloBoardId, setTrelloBoardId] = useState(clientData.trello_board_id || "");
  const [syncing, setSyncing] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMedia(file);
      setCompanyLogo(url);
    } catch (err) {
      console.error("Logo upload failed", err);
    }
  };

  useEffect(() => {
    if (editingPeriod && periodInputRef.current) {
      periodInputRef.current.focus();
      periodInputRef.current.select();
    }
  }, [editingPeriod]);

  useEffect(() => {
    if (addingColumn && newColumnInputRef.current) {
      newColumnInputRef.current.focus();
    }
  }, [addingColumn]);

  useEffect(() => {
    if (editingColumnId && editColumnInputRef.current) {
      editColumnInputRef.current.focus();
      editColumnInputRef.current.select();
    }
  }, [editingColumnId]);

  const savePeriod = () => {
    if (periodDraft.trim()) setPostingPeriod(periodDraft.trim());
    setEditingPeriod(false);
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      setAddingColumn(false);
      return;
    }
    try {
      await addColumn(newColumnName.trim());
      setNewColumnName("");
      setAddingColumn(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao criar coluna", variant: "destructive" });
    }
  };

  const handleRenameColumn = (id: string) => {
    if (editingColumnName.trim()) {
      renameColumn(id, editingColumnName.trim());
    }
    setEditingColumnId(null);
  };

  const handleDeleteColumn = (id: string) => {
    if (!confirm("Excluir esta coluna? Os posts serão movidos para 'Sem coluna'.")) return;
    deleteColumn(id);
  };

  // Posts without a column
  const unassignedPosts = posts.filter((p) => !p.columnId);

  const handleTrelloSync = async () => {
    if (!trelloBoardId.trim()) return;
    setSyncing(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/trello-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ boardId: trelloBoardId.trim(), clientId: clientData.id }),
        }
      );
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      // Save board ID to client record
      await supabase.from("clients").update({ trello_board_id: trelloBoardId.trim() } as any).eq("id", clientData.id);
      toast({
        title: "Sincronização concluída!",
        description: `${result.summary.tags} etiquetas, ${result.summary.columns} colunas, ${result.summary.posts} posts importados.`,
      });
      setTrelloSyncOpen(false);
      // Reload page to refresh data
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-full items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/admin")}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => logoInputRef.current?.click()}
              className="group relative flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary overflow-hidden transition-colors"
            >
              {companyLogo ? (
                <>
                  <img src={companyLogo} alt="Logo" className="h-full w-full object-contain" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-4 w-4 text-white" />
                  </div>
                </>
              ) : (
                <ImagePlus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
              )}
            </button>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{clientData.name}</h1>
              <p className="text-sm text-muted-foreground">{t("adminSubtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <div className="flex rounded-lg border bg-muted p-1">
              <button
                onClick={() => setView("kanban")}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${view === "kanban" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button variant="outline" onClick={() => setTrelloSyncOpen(true)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Trello Sync
            </Button>
            <Button onClick={() => { setCreateInColumnId(null); setCreateOpen(true); }} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> {t("newPost")}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-full p-6">
        <div className="mb-8 flex items-center justify-center gap-2">
          {editingPeriod ? (
            <Input
              ref={periodInputRef}
              value={periodDraft}
              onChange={(e) => setPeriodDraft(e.target.value)}
              onBlur={savePeriod}
              onKeyDown={(e) => { if (e.key === "Enter") savePeriod(); if (e.key === "Escape") { setPeriodDraft(postingPeriod); setEditingPeriod(false); } }}
              placeholder={t("editPeriodPlaceholder")}
              className="max-w-xs text-center text-2xl font-bold border-accent"
            />
          ) : (
            <button
              onClick={() => { setPeriodDraft(postingPeriod); setEditingPeriod(true); }}
              className="group flex items-center gap-2 text-2xl font-bold text-foreground hover:text-accent transition-colors"
            >
              {postingPeriod || "Clique para definir o período"}
              <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
            </button>
          )}
        </div>

        {view === "kanban" ? (
          <KanbanBoard
            posts={posts}
            columns={columns}
            unassignedPosts={unassignedPosts}
            editingColumnId={editingColumnId}
            editingColumnName={editingColumnName}
            setEditingColumnId={setEditingColumnId}
            setEditingColumnName={setEditingColumnName}
            editColumnInputRef={editColumnInputRef}
            handleRenameColumn={handleRenameColumn}
            handleDeleteColumn={handleDeleteColumn}
            updatePostStatus={updatePostStatus}
            deletePost={deletePost}
            setEditPost={setEditPost}
            setCreateInColumnId={setCreateInColumnId}
            setCreateOpen={setCreateOpen}
            addingColumn={addingColumn}
            setAddingColumn={setAddingColumn}
            newColumnName={newColumnName}
            setNewColumnName={setNewColumnName}
            newColumnInputRef={newColumnInputRef}
            handleAddColumn={handleAddColumn}
            movePostToColumn={movePostToColumn}
            t={t}
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isAdmin
                onStatusChange={(s) => updatePostStatus(post.id, s)}
                onDelete={() => deletePost(post.id)}
                onEdit={() => setEditPost(post)}
              />
            ))}
          </div>
        )}
      </main>

      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} defaultColumnId={createInColumnId} />
      <EditPostDialog post={editPost} open={!!editPost} onOpenChange={(open) => { if (!open) setEditPost(null); }} />

      {/* Trello Sync Dialog */}
      <Dialog open={trelloSyncOpen} onOpenChange={setTrelloSyncOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sincronizar com Trello</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Board ID do Trello</Label>
              <Input
                value={trelloBoardId}
                onChange={(e) => setTrelloBoardId(e.target.value)}
                placeholder="Ex: abc123def456"
                onKeyDown={(e) => { if (e.key === "Enter") handleTrelloSync(); }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Encontre o Board ID na URL do Trello: trello.com/b/<strong>BOARD_ID</strong>/nome-do-board
              </p>
            </div>
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              ⚠️ A sincronização substituirá todas as colunas e posts existentes deste cliente.
            </div>
            <Button
              onClick={handleTrelloSync}
              disabled={syncing || !trelloBoardId.trim()}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {syncing ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Sincronizando...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> Iniciar Sincronização</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AdminPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data } = await supabase.from("clients").select("*").eq("slug", slug).maybeSingle();
      if (!data) {
        navigate("/admin");
        return;
      }
      setClientData(data as ClientData);
      setLoading(false);
    };
    load();
  }, [slug, navigate]);

  if (loading || !clientData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <PostsProvider clientId={clientData.id} clientLogo={clientData.logo_url} clientPostingPeriod={clientData.posting_period}>
      <AdminPageInner clientData={clientData} />
    </PostsProvider>
  );
};

export default AdminPage;
