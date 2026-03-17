import { Post, Tag, TAG_TRANSLATION_KEYS } from "@/types/post";
import { Badge } from "@/components/ui/badge";
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
import { useState, useEffect, useCallback, useRef } from "react";

interface TrackingPanelProps {
  clientId: string;
  posts: Post[];
  columns?: { id: string; name: string }[];
  tags?: Tag[];
  isAdmin?: boolean;
  visibleToClient?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  entrada: { label: "Entrada", className: "bg-muted text-muted-foreground" },
  em_desenvolvimento: { label: "Em Desenvolvimento", className: "bg-warning/20 text-warning-foreground border-warning/30" },
  escrevendo_legenda: { label: "Escrevendo Legenda", className: "bg-info/20 text-info border-info/30" },
  pronto: { label: "Pronto", className: "bg-primary/20 text-primary border-primary/30" },
  finalizado: { label: "Finalizado", className: "bg-success/20 text-success border-success/30" },
  alteracao_solicitada: { label: "Alteração Solicitada", className: "bg-destructive/20 text-destructive border-destructive/30" },
};

function SortableItem({ post, isEntrada }: { post: Post; isEntrada: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const isDone = post.status === "finalizado";
  const isDev = post.status === "em_desenvolvimento";
  const statusInfo = STATUS_LABELS[post.status] || STATUS_LABELS.entrada;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 rounded-lg border-2 px-2 py-2",
        isDone && "border-success/20 bg-success/5",
        isDev && "border-warning/20 bg-warning/5",
        isEntrada && !isDone && !isDev && "border-red-400 bg-red-50 dark:bg-red-950/30 dark:border-red-600",
        !isDone && !isDev && !isEntrada && "border-transparent bg-card"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {isDone ? (
        <>
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-success">
            <Check className="h-2.5 w-2.5 text-success-foreground" />
          </div>
          <span className="text-sm font-medium text-muted-foreground line-through truncate">{post.title}</span>
        </>
      ) : (
        <>
          <Circle className={cn("h-3 w-3 shrink-0", isDev ? "text-warning-foreground" : isEntrada ? "text-red-500" : "text-muted-foreground")} />
          <span className={cn("text-sm font-medium truncate flex-1", isEntrada ? "text-red-700 dark:text-red-400" : "text-foreground")}>{post.title}</span>
          <Badge variant="outline" className={cn("text-[10px] shrink-0 font-semibold", isEntrada && !isDev ? "bg-red-500 text-white border-red-500 dark:bg-red-600 dark:border-red-600" : statusInfo.className)}>
            {isEntrada ? "Entrada" : statusInfo.label}
          </Badge>
        </>
      )}
    </div>
  );
}

export const TrackingPanel = ({ clientId, posts, columns = [], isAdmin = false, visibleToClient, onToggleVisibility }: TrackingPanelProps) => {
  const [orderedPosts, setOrderedPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  const savedOrderRef = useRef<string[]>([]);

  const entradaColumnId = columns.find((c) => c.name.toLowerCase() === "entrada")?.id;

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

  // Apply saved order to posts
  useEffect(() => {
    if (!loaded) return;
    const savedIds = savedOrderRef.current;
    if (savedIds.length > 0) {
      const postMap = new Map(posts.map((p) => [p.id, p]));
      // First: posts in saved order
      const ordered: Post[] = [];
      for (const id of savedIds) {
        const post = postMap.get(id);
        if (post) {
          ordered.push(post);
          postMap.delete(id);
        }
      }
      // Then: any new posts not in saved order
      for (const post of postMap.values()) {
        ordered.push(post);
      }
      setOrderedPosts(ordered);
    } else {
      setOrderedPosts(posts);
    }
  }, [posts, loaded]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allIds = orderedPosts.map((p) => p.id);

  const isEntrada = (post: Post) =>
    post.status === "entrada" || (entradaColumnId != null && post.columnId === entradaColumnId);

  const saveOrder = useCallback(async (ids: string[]) => {
    savedOrderRef.current = ids;
    await supabase
      .from("tracking_order" as any)
      .upsert({ client_id: clientId, post_ids: ids, updated_at: new Date().toISOString() } as any, { onConflict: "client_id" });
  }, [clientId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedPosts((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      saveOrder(newOrder.map((p) => p.id));
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

      <div className="space-y-1 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
        {orderedPosts.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
              {orderedPosts.map((post) => (
                <SortableItem key={post.id} post={post} isEntrada={isEntrada(post)} />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <p className="py-8 text-center text-xs text-muted-foreground">Nenhum post para acompanhar</p>
        )}
      </div>
    </div>
  );
};
