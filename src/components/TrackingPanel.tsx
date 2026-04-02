import { Post, Tag } from "@/types/post";
import { Check, Circle, Eye, EyeOff, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

interface TrackingPanelProps {
  clientId: string;
  posts: Post[];
  columns?: { id: string; name: string }[];
  tags?: Tag[];
  isAdmin?: boolean;
  visibleToClient?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
}

interface ProjectGroup {
  projectTitle: string;
  posts: Post[];
}

function isPostFinished(post: Post, tags: Tag[]): boolean {
  // Check status
  if (post.status.includes("finalizado")) return true;
  // Check tags - find any tag named "Finalizado" (case-insensitive)
  const finalizadoTagIds = tags
    .filter((t) => t.name.toLowerCase() === "finalizado")
    .map((t) => t.id);
  return post.tags.some((tagId) => finalizadoTagIds.includes(tagId));
}

function getColumnName(post: Post, columns: { id: string; name: string }[]): string {
  if (!post.columnId) return "";
  const col = columns.find((c) => c.id === post.columnId);
  return col?.name || "";
}

function SortableProjectGroup({
  group,
  columns,
  tags,
}: {
  group: ProjectGroup;
  columns: { id: string; name: string }[];
  tags: Tag[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.projectTitle,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const totalItems = group.posts.length;
  const doneItems = group.posts.filter((p) => isPostFinished(p, tags)).length;
  const allDone = totalItems > 0 && doneItems === totalItems;
  const progressPercent = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border bg-card p-3 shadow-sm transition-all",
        allDone && "border-success/30 bg-success/5"
      )}
    >
      {/* Project header */}
      <div className="flex items-center gap-2 mb-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <h4
            className={cn(
              "text-sm font-bold truncate",
              allDone ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {group.projectTitle}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  allDone ? "bg-success" : "bg-primary"
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground shrink-0">
              {doneItems}/{totalItems}
            </span>
          </div>
        </div>
      </div>

      {/* Deliverables list grouped by column */}
      <div className="space-y-2 pl-5">
        {(() => {
          // Group posts by column
          const byColumn = new Map<string, Post[]>();
          group.posts.forEach((post) => {
            const colName = getColumnName(post, columns);
            const key = colName || "__none__";
            if (!byColumn.has(key)) byColumn.set(key, []);
            byColumn.get(key)!.push(post);
          });

          return Array.from(byColumn.entries()).map(([colKey, colPosts]) => (
            <div key={colKey}>
              {colKey !== "__none__" && (
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  {colKey}
                </p>
              )}
              <div className="space-y-1">
                {colPosts.map((post) => {
                  const finished = isPostFinished(post, tags);
                  return (
                    <div
                      key={post.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                        finished ? "opacity-50" : "hover:bg-muted/50"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                          finished
                            ? "border-success bg-success"
                            : "border-muted-foreground/40 bg-transparent"
                        )}
                      >
                        {finished && <Check className="h-2.5 w-2.5 text-success-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={cn(
                            "text-xs font-medium block truncate",
                            finished
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          )}
                        >
                          {post.title}
                        </span>
                      </div>
                      {!finished && (
                        <Circle
                          className={cn(
                            "h-2 w-2 shrink-0 fill-current",
                            post.status.includes("em_desenvolvimento")
                              ? "text-warning"
                              : post.status.includes("alteracao_solicitada")
                              ? "text-destructive"
                              : post.status.includes("pronto")
                              ? "text-primary"
                              : "text-muted-foreground/40"
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}

export const TrackingPanel = ({
  clientId,
  posts,
  columns = [],
  tags = [],
  isAdmin = false,
  visibleToClient,
  onToggleVisibility,
}: TrackingPanelProps) => {
  const [orderedKeys, setOrderedKeys] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const savedOrderRef = useRef<string[]>([]);

  // Group posts by title (project)
  const projectGroups = useMemo(() => {
    const map = new Map<string, Post[]>();
    posts.forEach((post) => {
      const key = post.title || "Sem título";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(post);
    });
    const groups: ProjectGroup[] = [];
    map.forEach((groupPosts, projectTitle) => {
      groups.push({ projectTitle, posts: groupPosts });
    });
    return groups;
  }, [posts]);

  // Load saved order from DB
  useEffect(() => {
    const loadOrder = async () => {
      const { data } = await supabase
        .from("tracking_order" as any)
        .select("post_ids")
        .eq("client_id", clientId)
        .maybeSingle();
      if (data) {
        savedOrderRef.current = (data as any).post_ids || [];
      }
      setLoaded(true);
    };
    loadOrder();
  }, [clientId]);

  // Apply saved order
  useEffect(() => {
    if (!loaded) return;
    const savedKeys = savedOrderRef.current;
    const currentKeys = projectGroups.map((g) => g.projectTitle);
    if (savedKeys.length > 0) {
      const ordered: string[] = [];
      for (const key of savedKeys) {
        if (currentKeys.includes(key)) ordered.push(key);
      }
      for (const key of currentKeys) {
        if (!ordered.includes(key)) ordered.push(key);
      }
      setOrderedKeys(ordered);
    } else {
      setOrderedKeys(currentKeys);
    }
  }, [projectGroups, loaded]);

  const orderedGroups = useMemo(() => {
    const map = new Map(projectGroups.map((g) => [g.projectTitle, g]));
    return orderedKeys
      .map((key) => map.get(key))
      .filter(Boolean) as ProjectGroup[];
  }, [orderedKeys, projectGroups]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const saveOrder = useCallback(
    async (keys: string[]) => {
      savedOrderRef.current = keys;
      await supabase
        .from("tracking_order" as any)
        .upsert(
          { client_id: clientId, post_ids: keys, updated_at: new Date().toISOString() } as any,
          { onConflict: "client_id" }
        );
    },
    [clientId]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedKeys((prev) => {
      const oldIndex = prev.indexOf(active.id as string);
      const newIndex = prev.indexOf(over.id as string);
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      saveOrder(newOrder);
      return newOrder;
    });
  };

  return (
    <div className="w-80 shrink-0 rounded-xl border bg-gradient-to-b from-card to-card/80 p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          📊 Acompanhamento
        </h3>
        {isAdmin && onToggleVisibility && (
          <button
            onClick={() => onToggleVisibility(!visibleToClient)}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              visibleToClient
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={visibleToClient ? "Visível para o cliente" : "Oculto para o cliente"}
          >
            {visibleToClient ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
        {orderedGroups.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedKeys} strategy={verticalListSortingStrategy}>
              {orderedGroups.map((group) => (
                <SortableProjectGroup
                  key={group.projectTitle}
                  group={group}
                  columns={columns}
                  tags={tags}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <p className="py-8 text-center text-xs text-muted-foreground">
            Nenhum projeto para acompanhar
          </p>
        )}
      </div>
    </div>
  );
};
