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

interface ClientData {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  locale: string;
  posting_period: string;
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
  const [trelloBoardId, setTrelloBoardId] = useState("");
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
      toast({
        title: "Sincronização concluída!",
        description: `${result.summary.tags} etiquetas, ${result.summary.columns} colunas, ${result.summary.posts} posts importados.`,
      });
      setTrelloSyncOpen(false);
      setTrelloBoardId("");
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
          <div className="flex gap-4 overflow-x-auto pb-4">
            {/* Dynamic columns */}
            {columns.map((col) => {
              const columnPosts = posts.filter((p) => p.columnId === col.id);
              return (
                <div key={col.id} className="w-80 shrink-0 rounded-xl border bg-card/50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    {editingColumnId === col.id ? (
                      <Input
                        ref={editColumnInputRef}
                        value={editingColumnName}
                        onChange={(e) => setEditingColumnName(e.target.value)}
                        onBlur={() => handleRenameColumn(col.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameColumn(col.id);
                          if (e.key === "Escape") setEditingColumnId(null);
                        }}
                        className="h-7 text-sm font-semibold"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{col.name}</span>
                        <span className="text-xs text-muted-foreground">({columnPosts.length})</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingColumnId(col.id); setEditingColumnName(col.name); }}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteColumn(col.id)}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {columnPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        isAdmin
                        onStatusChange={(s) => updatePostStatus(post.id, s)}
                        onDelete={() => deletePost(post.id)}
                        onEdit={() => setEditPost(post)}
                      />
                    ))}
                    {columnPosts.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">{t("noPosts")}</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setCreateInColumnId(col.id); setCreateOpen(true); }}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/30 py-2 text-xs text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar post
                  </button>
                </div>
              );
            })}

            {/* Unassigned posts column (if any) */}
            {unassignedPosts.length > 0 && (
              <div className="w-80 shrink-0 rounded-xl border bg-muted/30 p-4">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm font-semibold text-muted-foreground">Sem coluna</span>
                  <span className="text-xs text-muted-foreground">({unassignedPosts.length})</span>
                </div>
                <div className="space-y-3">
                  {unassignedPosts.map((post) => (
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
              </div>
            )}

            {/* Add column button */}
            <div className="w-80 shrink-0">
              {addingColumn ? (
                <div className="rounded-xl border bg-card/50 p-4">
                  <Input
                    ref={newColumnInputRef}
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onBlur={handleAddColumn}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn();
                      if (e.key === "Escape") { setNewColumnName(""); setAddingColumn(false); }
                    }}
                    placeholder="Nome da coluna"
                    className="mb-2"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddColumn} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                      Criar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setNewColumnName(""); setAddingColumn(false); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingColumn(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 py-12 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  Nova coluna
                </button>
              )}
            </div>
          </div>
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
