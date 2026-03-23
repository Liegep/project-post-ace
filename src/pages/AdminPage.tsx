import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { ClientBillingConfig } from "@/components/billing/ClientBillingConfig";
import { BillingPermissionsPanel } from "@/components/billing/BillingPermissionsPanel";
import { useActivityLogs } from "@/hooks/useActivityLogs";
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
import { Plus, LayoutGrid, List, Pencil, ImagePlus, ArrowLeft, Trash2, GripVertical, Archive, RotateCcw, CheckSquare, X, Eye, EyeOff, ClipboardList, StickyNote, LinkIcon, ExternalLink, UserPlus, Settings2, History, Download } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { TrackingDrawer } from "@/components/TrackingDrawer";
import { ClientNotes } from "@/components/ClientNotes";
import { ClientLinksPanel } from "@/components/ClientLinksPanel";
import ClientAccessPanel from "@/components/ClientAccessPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverEvent, useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
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
  onStatusChange: (s: PostStatus[]) => void;
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
  tracking_visible_to_client: boolean;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  youtube_url: string;
  linkedin_url: string;
  twitter_url: string;
  website_url: string;
}

interface KanbanBoardProps {
  posts: Post[];
  columns: { id: string; name: string; position: number; visibleToClient: boolean }[];
  unassignedPosts: Post[];
  editingColumnId: string | null;
  editingColumnName: string;
  setEditingColumnId: (id: string | null) => void;
  setEditingColumnName: (name: string) => void;
  editColumnInputRef: React.RefObject<HTMLInputElement>;
  handleRenameColumn: (id: string) => void;
  handleDeleteColumn: (id: string) => void;
  updatePostStatus: (id: string, status: PostStatus[]) => void;
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
  toggleColumnVisibility: (id: string, visible: boolean) => void;
  selectionMode?: boolean;
  selectedPostIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  reorderColumns: (columns: { id: string; name: string; position: number; visibleToClient: boolean }[]) => void;
}

const SortableColumn = ({ col, children }: { col: { id: string }; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col-${col.id}`,
    data: { type: "column", columnId: col.id },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="w-80 shrink-0 rounded-xl border bg-card/50 p-4">
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mb-1 flex justify-center">
        <GripVertical className="h-4 w-4 text-muted-foreground/50 rotate-90" />
      </div>
      {children}
    </div>
  );
};

const KanbanBoard = ({
  posts, columns, unassignedPosts, editingColumnId, editingColumnName,
  setEditingColumnId, setEditingColumnName, editColumnInputRef, handleRenameColumn,
  handleDeleteColumn, updatePostStatus, deletePost, setEditPost, setCreateInColumnId,
  setCreateOpen, addingColumn, setAddingColumn, newColumnName, setNewColumnName,
  newColumnInputRef, handleAddColumn, movePostToColumn, reorderPostsInColumn, t,
  toggleColumnVisibility,
  selectionMode, selectedPostIds, onToggleSelect,
  reorderColumns,
}: KanbanBoardProps) => {
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "column") {
      setActiveColumnId(data.columnId);
    } else {
      const post = posts.find((p) => p.id === event.active.id);
      if (post) setActivePost(post);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const wasColumnDrag = activeColumnId !== null;
    setActivePost(null);
    setActiveColumnId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    // Handle column reorder
    if (wasColumnDrag) {
      const activeColId = activeId.replace("col-", "");
      const overColId = overId.replace("col-", "");
      const oldIndex = columns.findIndex((c) => c.id === activeColId);
      const newIndex = columns.findIndex((c) => c.id === overColId);
      if (oldIndex >= 0 && newIndex >= 0) {
        const newCols = arrayMove([...columns], oldIndex, newIndex).map((c, i) => ({ ...c, position: i }));
        reorderColumns(newCols);
      }
      return;
    }

    // Handle post reorder
    const postId = activeId;

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
  const columnSortIds = columns.map((c) => `col-${c.id}`);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        <SortableContext items={columnSortIds} strategy={horizontalListSortingStrategy}>
          {columns.map((col) => {
            const columnPosts = posts.filter((p) => p.columnId === col.id).sort((a, b) => a.position - b.position);
            return (
              <SortableColumn key={col.id} col={col}>
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
                      onClick={() => toggleColumnVisibility(col.id, !col.visibleToClient)}
                      className={`rounded p-1 transition-colors ${col.visibleToClient ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                      title={col.visibleToClient ? t("visibleToClient") : t("hiddenFromClient")}
                    >
                      {col.visibleToClient ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => { setCreateInColumnId(col.id); setCreateOpen(true); }}
                      className="rounded p-1 text-muted-foreground hover:bg-accent/10 hover:text-accent"
                      title={t("addPost")}
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
              </SortableColumn>
            );
          })}
        </SortableContext>

        {/* Unassigned posts column */}
        {unassignedPosts.length > 0 && (
          <div className="w-80 shrink-0 rounded-xl border bg-muted/30 p-4">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm font-semibold text-muted-foreground">{t("noColumn")}</span>
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
                placeholder={t("columnName")}
                className="mb-2"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddColumn} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                  {t("create")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setNewColumnName(""); setAddingColumn(false); }}>
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 py-12 text-sm text-muted-foreground hover:border-accent hover:text-accent transition-colors"
            >
              <Plus className="h-5 w-5" /> {t("newColumn")}
              
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
        {activeColumnId && (
          <div className="w-80 rotate-1 opacity-80 rounded-xl border bg-card/50 p-4 shadow-lg">
            <span className="text-sm font-semibold text-foreground">
              {columns.find((c) => c.id === activeColumnId)?.name}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

const ArchivedView = ({ archivedPosts, unarchivePost, deletePost, selectionMode, selectedPostIds, onToggleSelect, t }: {
  archivedPosts: Post[];
  unarchivePost: (id: string) => void;
  deletePost: (id: string) => void;
  selectionMode?: boolean;
  selectedPostIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  t: (key: any) => string;
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
        <h2 className="text-xl font-semibold text-foreground">{t("noArchivedPosts")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("archivedPostsAppearHere")}</p>
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
                        <RotateCcw className="mr-1 h-3 w-3" /> {t("restore")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive text-xs"
                        onClick={() => { if (confirm(t("deletePermanently"))) deletePost(post.id); }}
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
    posts, archivedPosts, columns, tags, updatePostStatus, deletePost, postingPeriod, setPostingPeriod,
    companyLogo, setCompanyLogo, uploadMedia, addColumn, renameColumn, deleteColumn, toggleColumnVisibility,
    movePostToColumn, reorderPostsInColumn, unarchivePost, bulkUpdateStatus, bulkDeletePosts, bulkMoveToColumn, reorderColumns,
    clientId: ctxClientId,
  } = usePosts();
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [activeTab, setActiveTab] = useState<"board" | "archived" | "activity">("board");
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

  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  // Notes panel state
  const [notesCount, setNotesCount] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  const [linksCount, setLinksCount] = useState(0);
  const [linksOpen, setLinksOpen] = useState(false);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPostIds, setSelectedPostIds] = useState<Set<string>>(new Set());
  const [showArchivedToClient, setShowArchivedToClient] = useState(clientData.show_archived_to_client);
  const [allowClientEditCaption, setAllowClientEditCaption] = useState((clientData as any).allow_client_edit_caption ?? false);
  const [allowClientCreatePost, setAllowClientCreatePost] = useState((clientData as any).allow_client_create_post ?? false);
  const [allowClientDownload, setAllowClientDownload] = useState((clientData as any).allow_client_download ?? false);
  const [trackingEnabled, setTrackingEnabled] = useState(clientData.tracking_enabled ?? false);
  const [trackingVisibleToClient, setTrackingVisibleToClient] = useState(clientData.tracking_visible_to_client ?? false);

  const [searchParams, setSearchParams] = useSearchParams();

  // Auto-open post from query param (e.g. from dashboard notification)
  useEffect(() => {
    const postId = searchParams.get("postId");
    if (postId && posts.length > 0) {
      const found = posts.find((p) => p.id === postId);
      if (found) {
        setEditPost(found);
        // Clean up the query param
        searchParams.delete("postId");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, posts]);

  // Activity logs for this client
  const activityLogs = useActivityLogs({ clientId: ctxClientId, enabled: activeTab === "activity" });

    const toggleShowArchivedToClient = async (checked: boolean) => {
    await supabase.from("clients").update({ show_archived_to_client: checked } as any).eq("id", clientData.id);
  };

  const toggleAllowClientEditCaption = async (checked: boolean) => {
    setAllowClientEditCaption(checked);
    await supabase.from("clients").update({ allow_client_edit_caption: checked } as any).eq("id", clientData.id);
  };

  const toggleAllowClientCreatePost = async (checked: boolean) => {
    setAllowClientCreatePost(checked);
    await supabase.from("clients").update({ allow_client_create_post: checked } as any).eq("id", clientData.id);
  };

  const toggleAllowClientDownload = async (checked: boolean) => {
    setAllowClientDownload(checked);
    await supabase.from("clients").update({ allow_client_download: checked } as any).eq("id", clientData.id);
  };

  const enableTracking = async () => {
    // Create default steps
    const defaultSteps = [
      { name: "Roteiro", color: "#6366f1" },
      { name: "Design / Arte", color: "#f59e0b" },
      { name: "Legenda", color: "#3b82f6" },
      { name: "Revisão", color: "#8b5cf6" },
      { name: "Agendado", color: "#06b6d4" },
      { name: "Publicado", color: "#22c55e" },
    ];
    for (let i = 0; i < defaultSteps.length; i++) {
      await supabase.from("tracking_steps").insert({
        client_id: clientData.id,
        name: defaultSteps[i].name,
        color: defaultSteps[i].color,
        position: i,
      } as any);
    }
    await supabase.from("clients").update({ tracking_enabled: true } as any).eq("id", clientData.id);
    setTrackingEnabled(true);
    toast({ title: t("trackingCreated"), description: t("trackingCreatedDesc") });
  };

  const disableTracking = async () => {
    await supabase.from("clients").update({ tracking_enabled: false } as any).eq("id", clientData.id);
    setTrackingEnabled(false);
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

  const handleBulkStatusChange = async (statuses: PostStatus[]) => {
    const ids = Array.from(selectedPostIds);
    await bulkUpdateStatus(ids, statuses);
    exitSelectionMode();
    toast({ title: `${ids.length} ${t("postsUpdated")}` });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedPostIds);
    if (!confirm(t("confirmBulkDelete").replace("{count}", String(ids.length)))) return;
    await bulkDeletePosts(ids);
    exitSelectionMode();
    toast({ title: `${ids.length} ${t("postsDeleted")}` });
  };

  const handleBulkUnarchive = async () => {
    const ids = Array.from(selectedPostIds);
    for (const id of ids) await unarchivePost(id);
    exitSelectionMode();
    toast({ title: `${ids.length} ${t("postsRestored")}` });
  };

  const handleBulkMoveToColumn = async (columnId: string) => {
    const ids = Array.from(selectedPostIds);
    const targetColumnId = columnId === "__unassigned__" ? null : columnId;
    await bulkMoveToColumn(ids, targetColumnId);
    exitSelectionMode();
    toast({ title: `${ids.length} ${t("postsMoved")}` });
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
      toast({ title: t("columnCreateError"), variant: "destructive" });
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
    if (!confirm(t("deleteColumnConfirm"))) return;
    deleteColumn(id);
  };

  // Posts without a column
  const unassignedPosts = posts.filter((p) => !p.columnId).sort((a, b) => a.position - b.position);


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex max-w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => navigate("/admin")}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => logoInputRef.current?.click()}
              className="group relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary overflow-hidden transition-colors shrink-0"
            >
              {companyLogo ? (
                <>
                  <img src={companyLogo} alt="Logo" className="h-full w-full object-contain" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-4 w-4 text-white" />
                  </div>
                </>
              ) : (
                <ImagePlus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              )}
            </button>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground cursor-pointer hover:text-primary transition-colors truncate" onClick={() => window.open(`/client/${clientData.slug}`, '_blank')}>{clientData.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{t("adminSubtitle")}</p>
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
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
              <CheckSquare className="mr-2 h-4 w-4" /> {selectionMode ? t("cancel") : t("select")}
            </Button>
            {!trackingEnabled && (
              <Button variant="outline" onClick={enableTracking}>
                <ClipboardList className="mr-2 h-4 w-4" /> {t("createTracking")}
              </Button>
            )}
            <Button onClick={() => { setCreateInColumnId(null); setCreateOpen(true); }} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> {t("newPost")}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setSettingsDrawerOpen(true)} title="Configurações">
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center gap-1.5">
            <Button size="sm" onClick={() => { setCreateInColumnId(null); setCreateOpen(true); }} className="bg-accent text-accent-foreground hover:bg-accent/90 h-8 px-2.5">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSettingsDrawerOpen(true)}>
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile settings drawer */}
      <Sheet open={settingsDrawerOpen} onOpenChange={setSettingsDrawerOpen}>
        <SheetContent side="right" className="w-[300px] overflow-y-auto p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="text-left text-base">Configurações</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col divide-y">
            {/* View toggle */}
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Visualização</p>
              <div className="flex rounded-lg border bg-muted p-1">
                <button
                  onClick={() => setView("kanban")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors ${view === "kanban" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  <LayoutGrid className="h-4 w-4 mx-auto" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm transition-colors ${view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
                >
                  <List className="h-4 w-4 mx-auto" />
                </button>
              </div>
            </div>

            {/* Quick actions */}
            <div className="px-5 py-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Ações</p>
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                className="w-full justify-start"
                onClick={() => { selectionMode ? exitSelectionMode() : setSelectionMode(true); setSettingsDrawerOpen(false); }}
              >
                <CheckSquare className="mr-2 h-4 w-4" /> {selectionMode ? t("cancel") : t("select")}
              </Button>
              {!trackingEnabled && (
                <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { enableTracking(); setSettingsDrawerOpen(false); }}>
                  <ClipboardList className="mr-2 h-4 w-4" /> {t("createTracking")}
                </Button>
              )}
            </div>

            {/* Panels: Recados, Links, Acesso */}
            <div className="px-5 py-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Painéis</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start relative"
                onClick={() => { setSettingsDrawerOpen(false); setNotesOpen(true); }}
              >
                <StickyNote className="mr-2 h-4 w-4 text-amber-500" />
                Recados
                {notesCount > 0 && (
                  <span className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {notesCount}
                  </span>
                )}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start relative" onClick={() => { setSettingsDrawerOpen(false); setLinksOpen(true); }}>
                <LinkIcon className="mr-2 h-4 w-4 text-blue-500" />
                Links
                {linksCount > 0 && (
                  <span className="ml-auto rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {linksCount}
                  </span>
                )}
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <UserPlus className="mr-2 h-4 w-4 text-green-500" />
                    Acesso do Cliente
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-[440px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-green-500" />
                      Acesso do Cliente
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <ClientAccessPanel clientId={clientData.id} clientName={clientData.name} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Permissions */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Permissões do Cliente</p>
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground flex items-center gap-2">
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  Editar legenda
                </label>
                <Switch checked={allowClientEditCaption} onCheckedChange={toggleAllowClientEditCaption} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  Criar posts
                </label>
                <Switch checked={allowClientCreatePost} onCheckedChange={toggleAllowClientCreatePost} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground flex items-center gap-2">
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  Baixar conteúdo
                </label>
                <Switch checked={allowClientDownload} onCheckedChange={toggleAllowClientDownload} />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-foreground flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  Mostrar arquivados
                </label>
                <Switch checked={showArchivedToClient} onCheckedChange={toggleShowArchivedToClient} />
              </div>
              {trackingEnabled && (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-foreground flex items-center gap-2">
                      <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                      Tracking ativo
                    </label>
                    <Switch checked={trackingEnabled} onCheckedChange={(checked) => { if (!checked) disableTracking(); }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-foreground flex items-center gap-2">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      Tracking visível
                    </label>
                    <Switch checked={trackingVisibleToClient} onCheckedChange={async (visible) => {
                      setTrackingVisibleToClient(visible);
                      await supabase.from("clients").update({ tracking_visible_to_client: visible }).eq("id", clientData.id);
                    }} />
                  </div>
                </>
              )}
            </div>

            {/* Billing Config */}
            <div className="px-5 py-4 border-t">
              <ClientBillingConfig clientId={clientData.id} />
            </div>

            {/* Billing Permissions */}
            <div className="px-5 border-t">
              <BillingPermissionsPanel clientId={clientData.id} />
            </div>

            {/* Language */}
            <div className="px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Idioma</p>
              <LanguageSelector />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile notes sheet (opened from settings drawer) */}
      <Sheet open={notesOpen} onOpenChange={setNotesOpen}>
        <SheetContent className="w-full sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5 text-amber-500" />
              {t("clientNotes")}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ClientNotes clientId={clientData.id} onCountChange={setNotesCount} />
          </div>
        </SheetContent>
      </Sheet>

      <main className="mx-auto max-w-full p-4 sm:p-6">
        {/* Tab switcher */}
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-2">
          <div className="flex rounded-lg border bg-muted p-1">
            <button
              onClick={() => setActiveTab("board")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "board" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="mr-1.5 inline h-4 w-4" /> {t("board")}
            </button>
            <button
              onClick={() => setActiveTab("archived")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "archived" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Archive className="mr-1.5 inline h-4 w-4" /> {t("archived")}
              {archivedPosts.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold">
                  {archivedPosts.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "activity" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <History className="mr-1.5 inline h-4 w-4" /> Atividades
            </button>
          </div>
          {/* Desktop-only permission toggles */}
          {activeTab === "archived" && (
            <div className="hidden md:flex items-center gap-2 ml-3">
              <Switch
                id="show-archived-client"
                checked={showArchivedToClient}
                onCheckedChange={toggleShowArchivedToClient}
              />
              <label htmlFor="show-archived-client" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                {showArchivedToClient ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {showArchivedToClient ? t("visibleToClient") : t("hiddenFromClient")}
              </label>
            </div>
          )}
          {activeTab === "board" && (
            <div className="hidden md:flex items-center gap-4 ml-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="allow-client-edit-caption"
                  checked={allowClientEditCaption}
                  onCheckedChange={toggleAllowClientEditCaption}
                />
                <label htmlFor="allow-client-edit-caption" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                  <Pencil className="h-3.5 w-3.5" />
                  {allowClientEditCaption ? t("clientCanEditCaption") : t("clientCannotEditCaption")}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="allow-client-create-post"
                  checked={allowClientCreatePost}
                  onCheckedChange={toggleAllowClientCreatePost}
                />
                <label htmlFor="allow-client-create-post" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  {allowClientCreatePost ? t("clientCanCreatePosts") : t("clientCannotCreatePosts")}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="allow-client-download"
                  checked={allowClientDownload}
                  onCheckedChange={toggleAllowClientDownload}
                />
                <label htmlFor="allow-client-download" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" />
                  {allowClientDownload ? "Cliente pode baixar" : "Cliente não pode baixar"}
                </label>
              </div>
              {trackingEnabled && (
                <div className="flex items-center gap-2">
                  <Switch
                    id="tracking-toggle"
                    checked={trackingEnabled}
                    onCheckedChange={(checked) => { if (!checked) disableTracking(); }}
                  />
                  <label htmlFor="tracking-toggle" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    {t("trackingActive")}
                  </label>
                </div>
              )}
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
                  {postingPeriod || t("clickToSetPeriod")}
                  <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                </button>
              )}
            </div>

            {view === "kanban" ? (
              <div className="flex gap-4">
                <div className="flex-1 min-w-0 overflow-x-auto">
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
                    toggleColumnVisibility={toggleColumnVisibility}
                    selectionMode={selectionMode}
                    selectedPostIds={selectedPostIds}
                    onToggleSelect={toggleSelect}
                    reorderColumns={reorderColumns}
                  />
                </div>
                {trackingEnabled && (
                  <TrackingDrawer
                    clientId={clientData.id}
                    posts={posts}
                    columns={columns}
                    tags={tags}
                    isAdmin
                    visibleToClient={trackingVisibleToClient}
                    onToggleVisibility={async (visible) => {
                      setTrackingVisibleToClient(visible);
                      await supabase.from("clients").update({ tracking_visible_to_client: visible }).eq("id", clientData.id);
                    }}
                  />
                )}
                
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
                    selectionMode={selectionMode}
                    isSelected={selectedPostIds.has(post.id)}
                    onToggleSelect={toggleSelect}
                  />
                ))}
              </div>
            )}
          </>
        ) : activeTab === "archived" ? (
          <ArchivedView
            archivedPosts={archivedPosts}
            unarchivePost={unarchivePost}
            deletePost={deletePost}
            selectionMode={selectionMode}
            selectedPostIds={selectedPostIds}
            onToggleSelect={toggleSelect}
            t={t}
          />
        ) : (
          <div className="mx-auto max-w-2xl">
            <ActivityTimeline
              logs={activityLogs.logs}
              loading={activityLogs.loading}
              hasMore={activityLogs.hasMore}
              onLoadMore={activityLogs.loadMore}
              showFilters
              showClientName={false}
            />
          </div>
        )}
      </main>

      {/* Floating bulk action bar */}
      {selectionMode && selectedPostIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-xl">
          <span className="text-sm font-semibold text-foreground">{selectedPostIds.size} {t("selected")}</span>
          <div className="h-6 w-px bg-border" />
          {activeTab === "board" ? (
            <>
              <Select onValueChange={(v) => handleBulkStatusChange([v as PostStatus])}>
                <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
                  <SelectValue placeholder={t("changeStatus")} />
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
                    <SelectValue placeholder={t("moveToColumn")} />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                    ))}
                    <SelectItem value="__unassigned__">{t("noColumn")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange(["finalizado"])}>
                <Archive className="mr-1.5 h-3.5 w-3.5" /> {t("archive")}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={handleBulkUnarchive}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {t("restore")}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleBulkDelete}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> {t("deleteAction")}
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button size="sm" variant="ghost" onClick={exitSelectionMode}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

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
