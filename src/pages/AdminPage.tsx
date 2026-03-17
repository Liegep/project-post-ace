import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PostsProvider, usePosts } from "@/context/PostsContext";
import { Post, PostStatus, STATUS_CONFIG } from "@/types/post";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PostCard } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { EditPostDialog } from "@/components/EditPostDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LayoutGrid, List, Pencil, ImagePlus, ArrowLeft, Trash2, GripVertical, RefreshCw, Archive, RotateCcw, CheckSquare, X, Eye, EyeOff, ClipboardList } from "lucide-react";
import { TrackingPanel } from "@/components/TrackingPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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

const DraggablePostCard = ({ post, onStatusChange, onDelete, onEdit, selectionMode, isSelected, onToggleSelect }: {
  post: Post;
  onStatusChange: (s: PostStatus) => void;
  onDelete: () => void;
  onEdit: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: post.id,
    data: { type: "post", post },
    disabled: selectionMode,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(selectionMode ? {} : listeners)}>
      <PostCard
        post={post}
        isAdmin
        onStatusChange={onStatusChange}
        onDelete={onDelete}
        onEdit={onEdit}
        selectionMode={selectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
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
  show_archived_to_client: boolean;
  tracking_enabled: boolean;
}

interface KanbanBoardProps {
  posts: Post[];
  columns: { id: string; name: string; position: number }[];
  unassignedPosts: Post[];
  editingColumnId: string | null;
  editingColumnName: string;
  setEditingColumnId: (id: string | null) => void;
  setEditingColumnName: (name: string) => void;
  editColumnInputRef: React.RefObject<HTMLInputElement>;
  handleRenameColumn: (id: string) => void;
  handleDeleteColumn: (id: string) => void;
  updatePostStatus: (id: string, status: PostStatus) => void;
  deletePost: (id: string) => void;
  setEditPost: (post: Post) => void;
  setCreateInColumnId: (id: string | null) => void;
  setCreateOpen: (open: boolean) => void;
  addingColumn: boolean;
  setAddingColumn: (v: boolean) => void;
  newColumnName: string;
  setNewColumnName: (v: string) => void;
  newColumnInputRef: React.RefObject<HTMLInputElement>;
  handleAddColumn: () => void;
  movePostToColumn: (postId: string, columnId: string | null) => void;
  reorderPostsInColumn: (columnId: string | null, orderedPostIds: string[]) => void;
  t: (key: any) => string;
  selectionMode?: boolean;
  selectedPostIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

const KanbanBoard = ({
  posts, columns, unassignedPosts, editingColumnId, editingColumnName,
  setEditingColumnId, setEditingColumnName, editColumnInputRef, handleRenameColumn,
  handleDeleteColumn, updatePostStatus, deletePost, setEditPost, setCreateInColumnId,
  setCreateOpen, addingColumn, setAddingColumn, newColumnName, setNewColumnName,
  newColumnInputRef, handleAddColumn, movePostToColumn, reorderPostsInColumn, t,
  selectionMode, selectedPostIds, onToggleSelect,
}: KanbanBoardProps) => {
  const [activePost, setActivePost] = useState<Post | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const post = posts.find((p) => p.id === event.active.id);
    if (post) setActivePost(post);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActivePost(null);
    const { active, over } = event;
    if (!over) return;

    const postId = active.id as string;
    const overId = over.id as string;
    if (postId === overId) return;

    // Determine target column
    let targetColumnId: string | null = null;
    if (overId === UNASSIGNED_COLUMN_ID) {
      targetColumnId = null;
    } else if (columns.some((c) => c.id === overId)) {
      targetColumnId = overId;
    } else {
      const overPost = posts.find((p) => p.id === overId);
      if (overPost) {
        targetColumnId = overPost.columnId;
      } else {
        return;
      }
    }

    const currentPost = posts.find((p) => p.id === postId);
    if (!currentPost) return;

    // Get posts in the target column (sorted by position)
    const targetPosts = posts
      .filter((p) => p.columnId === targetColumnId && p.id !== postId)
      .sort((a, b) => a.position - b.position);

    // Find insert index
    const overIndex = targetPosts.findIndex((p) => p.id === overId);
    const newOrder = [...targetPosts];
    if (overIndex >= 0) {
      newOrder.splice(overIndex, 0, currentPost);
    } else {
      newOrder.push(currentPost);
    }

    reorderPostsInColumn(targetColumnId, newOrder.map((p) => p.id));
  };

  const allPostIds = posts.map((p) => p.id);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const columnPosts = posts.filter((p) => p.columnId === col.id).sort((a, b) => a.position - b.position);
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
                    onClick={() => { setCreateInColumnId(col.id); setCreateOpen(true); }}
                    className="rounded p-1 text-muted-foreground hover:bg-accent/10 hover:text-accent"
                    title="Adicionar post"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
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
              <SortableContext items={columnPosts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <DroppableColumn id={col.id}>
                  {columnPosts.map((post) => (
                    <DraggablePostCard
                      key={post.id}
                      post={post}
                      onStatusChange={(s) => updatePostStatus(post.id, s)}
                      onDelete={() => deletePost(post.id)}
                      onEdit={() => setEditPost(post)}
                      selectionMode={selectionMode}
                      isSelected={selectedPostIds?.has(post.id)}
                      onToggleSelect={onToggleSelect}
                    />
                  ))}
                  {columnPosts.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("noPosts")}</p>
                  )}
                </DroppableColumn>
              </SortableContext>


            </div>
          );
        })}

        {/* Unassigned posts column */}
        {unassignedPosts.length > 0 && (
          <div className="w-80 shrink-0 rounded-xl border bg-muted/30 p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">Sem coluna</span>
              <span className="text-xs text-muted-foreground">({unassignedPosts.length})</span>
            </div>
            <SortableContext items={unassignedPosts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <DroppableColumn id={UNASSIGNED_COLUMN_ID}>
                {unassignedPosts.map((post) => (
                  <DraggablePostCard
                    key={post.id}
                    post={post}
                    onStatusChange={(s) => updatePostStatus(post.id, s)}
                    onDelete={() => deletePost(post.id)}
                    onEdit={() => setEditPost(post)}
                    selectionMode={selectionMode}
                    isSelected={selectedPostIds?.has(post.id)}
                    onToggleSelect={onToggleSelect}
                  />
                ))}
              </DroppableColumn>
            </SortableContext>
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

      <DragOverlay>
        {activePost && (
          <div className="w-80 rotate-2 opacity-90">
            <PostCard post={activePost} isAdmin />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

const ArchivedView = ({ archivedPosts, unarchivePost, deletePost, selectionMode, selectedPostIds, onToggleSelect }: {
  archivedPosts: Post[];
  unarchivePost: (id: string) => void;
  deletePost: (id: string) => void;
  selectionMode?: boolean;
  selectedPostIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) => {
  const grouped = archivedPosts.reduce<Record<string, Post[]>>((acc, post) => {
    const date = post.archivedAt || post.createdAt;
    const key = format(date, "MMMM yyyy", { locale: ptBR });
    if (!acc[key]) acc[key] = [];
    acc[key].push(post);
    return acc;
  }, {});

  const months = Object.keys(grouped).sort((a, b) => {
    const dateA = grouped[a][0].archivedAt || grouped[a][0].createdAt;
    const dateB = grouped[b][0].archivedAt || grouped[b][0].createdAt;
    return dateB.getTime() - dateA.getTime();
  });

  if (archivedPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 rounded-full bg-muted p-6">
          <Archive className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Nenhum post arquivado</h2>
        <p className="mt-1 text-sm text-muted-foreground">Posts com status "Finalizado" aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {months.map((month) => (
        <div key={month} className="w-80 shrink-0 rounded-xl border bg-card/50 p-4">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground capitalize">{month}</span>
            <span className="text-xs text-muted-foreground">({grouped[month].length})</span>
          </div>
          <div className="space-y-3">
            {grouped[month].map((post) => {
              const isSelected = selectedPostIds?.has(post.id);
              return (
                <div key={post.id} className="relative">
                  <PostCard
                    post={post}
                    isAdmin
                    hideFeedback
                    selectionMode={selectionMode}
                    isSelected={isSelected}
                    onToggleSelect={onToggleSelect}
                    onEdit={() => {}}
                  />
                  {!selectionMode && (
                    <div className="mt-1.5 flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => unarchivePost(post.id)}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" /> Restaurar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive text-xs"
                        onClick={() => { if (confirm("Excluir permanentemente?")) deletePost(post.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const AdminPageInner = ({ clientData }: { clientData: ClientData }) => {
  const {
    posts, archivedPosts, columns, updatePostStatus, deletePost, postingPeriod, setPostingPeriod,
    companyLogo, setCompanyLogo, uploadMedia, addColumn, renameColumn, deleteColumn,
    movePostToColumn, reorderPostsInColumn, unarchivePost, bulkUpdateStatus, bulkDeletePosts, bulkMoveToColumn,
  } = usePosts();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [activeTab, setActiveTab] = useState<"board" | "archived">("board");
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

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [showArchivedToClient, setShowArchivedToClient] = useState(clientData.show_archived_to_client);
  const [allowClientEditCaption, setAllowClientEditCaption] = useState((clientData as any).allow_client_edit_caption ?? false);
  const [trackingEnabled, setTrackingEnabled] = useState(clientData.tracking_enabled ?? false);

  const toggleShowArchivedToClient = async (checked: boolean) => {
    setShowArchivedToClient(checked);
    await supabase.from("clients").update({ show_archived_to_client: checked } as any).eq("id", clientData.id);
  };

  const toggleAllowClientEditCaption = async (checked: boolean) => {
    setAllowClientEditCaption(checked);
    await supabase.from("clients").update({ allow_client_edit_caption: checked } as any).eq("id", clientData.id);
  };

  const toggleSelect = (id: string) => {
    setSelectedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedPostIds(new Set());
  };

  const handleBulkStatusChange = async (status: PostStatus) => {
    const ids = Array.from(selectedPostIds);
    await bulkUpdateStatus(ids, status);
    exitSelectionMode();
    toast({ title: `${ids.length} posts atualizados` });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedPostIds);
    if (!confirm(`Excluir ${ids.length} posts permanentemente?`)) return;
    await bulkDeletePosts(ids);
    exitSelectionMode();
    toast({ title: `${ids.length} posts excluídos` });
  };

  const handleBulkUnarchive = async () => {
    const ids = Array.from(selectedPostIds);
    for (const id of ids) await unarchivePost(id);
    exitSelectionMode();
    toast({ title: `${ids.length} posts restaurados` });
  };

  const handleBulkMoveToColumn = async (columnId: string) => {
    const ids = Array.from(selectedPostIds);
    const targetColumnId = columnId === "__unassigned__" ? null : columnId;
    await bulkMoveToColumn(ids, targetColumnId);
    exitSelectionMode();
    toast({ title: `${ids.length} posts movidos` });
  };

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

  const addingColumnRef = useRef(false);
  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      setAddingColumn(false);
      return;
    }
    if (addingColumnRef.current) return;
    addingColumnRef.current = true;
    try {
      await addColumn(newColumnName.trim());
      setNewColumnName("");
      setAddingColumn(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao criar coluna", variant: "destructive" });
    } finally {
      addingColumnRef.current = false;
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
  const unassignedPosts = posts.filter((p) => !p.columnId).sort((a, b) => a.position - b.position);

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
        description: `${result.summary.tags} etiquetas, ${result.summary.columns} colunas, ${result.summary.postsCreated ?? result.summary.posts ?? 0} posts criados, ${result.summary.postsUpdated ?? 0} posts atualizados.`,
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
              <h1 className="text-2xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => window.open(`/client/${clientData.slug}`, '_blank')}>{clientData.name}</h1>
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
            <Button
              variant={selectionMode ? "default" : "outline"}
              onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
            >
              <CheckSquare className="mr-2 h-4 w-4" /> {selectionMode ? "Cancelar" : "Selecionar"}
            </Button>
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
        {/* Tab switcher */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex rounded-lg border bg-muted p-1">
            <button
              onClick={() => setActiveTab("board")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "board" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="mr-1.5 inline h-4 w-4" />
              Quadro
            </button>
            <button
              onClick={() => setActiveTab("archived")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "archived" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Archive className="mr-1.5 inline h-4 w-4" />
              Arquivados
              {archivedPosts.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold">
                  {archivedPosts.length}
                </span>
              )}
            </button>
          </div>
          {activeTab === "archived" && (
            <div className="flex items-center gap-2 ml-3">
              <Switch
                id="show-archived-client"
                checked={showArchivedToClient}
                onCheckedChange={toggleShowArchivedToClient}
              />
              <label htmlFor="show-archived-client" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                {showArchivedToClient ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {showArchivedToClient ? "Visível para o cliente" : "Oculto do cliente"}
              </label>
            </div>
          )}
          {activeTab === "board" && (
            <div className="flex items-center gap-2 ml-3">
              <Switch
                id="allow-client-edit-caption"
                checked={allowClientEditCaption}
                onCheckedChange={toggleAllowClientEditCaption}
              />
              <label htmlFor="allow-client-edit-caption" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                <Pencil className="h-3.5 w-3.5" />
                {allowClientEditCaption ? "Cliente pode editar legenda" : "Cliente não edita legenda"}
              </label>
            </div>
          )}
        </div>

        {activeTab === "board" ? (
          <>
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
                reorderPostsInColumn={reorderPostsInColumn}
                t={t}
                selectionMode={selectionMode}
                selectedPostIds={selectedPostIds}
                onToggleSelect={toggleSelect}
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
                    selectionMode={selectionMode}
                    isSelected={selectedPostIds.has(post.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <ArchivedView
            archivedPosts={archivedPosts}
            unarchivePost={unarchivePost}
            deletePost={deletePost}
            selectionMode={selectionMode}
            selectedPostIds={selectedPostIds}
            onToggleSelect={toggleSelect}
          />
        )}
      </main>

      {/* Floating bulk action bar */}
      {selectionMode && selectedPostIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-xl">
          <span className="text-sm font-semibold text-foreground">{selectedPostIds.size} selecionado(s)</span>
          <div className="h-6 w-px bg-border" />
          {activeTab === "board" ? (
            <>
              <Select onValueChange={(v) => handleBulkStatusChange(v as PostStatus)}>
                <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
                  <SelectValue placeholder="Mudar status" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_CONFIG) as PostStatus[]).map((key) => (
                    <SelectItem key={key} value={key}>{STATUS_CONFIG[key].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {columns.length > 0 && (
                <Select onValueChange={(v) => handleBulkMoveToColumn(v)}>
                  <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
                    <SelectValue placeholder="Mover p/ coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                    ))}
                    <SelectItem value="__unassigned__">Sem coluna</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange("finalizado")}>
                <Archive className="mr-1.5 h-3.5 w-3.5" /> Arquivar
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={handleBulkUnarchive}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restaurar
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleBulkDelete}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={exitSelectionMode}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

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
