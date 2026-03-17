import { Post } from "@/types/post";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, Code2, Eye, EyeOff, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { useState, useEffect } from "react";

interface TrackingPanelProps {
  clientId: string;
  posts: Post[];
  isAdmin?: boolean;
  visibleToClient?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
  onReorderPosts?: (orderedIds: string[]) => void;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  entrada: { label: "Entrada", className: "bg-muted text-muted-foreground" },
  em_desenvolvimento: { label: "Em Desenvolvimento", className: "bg-warning/20 text-warning-foreground border-warning/30" },
  escrevendo_legenda: { label: "Escrevendo Legenda", className: "bg-info/20 text-info border-info/30" },
  pronto: { label: "Pronto", className: "bg-primary/20 text-primary border-primary/30" },
  finalizado: { label: "Finalizado", className: "bg-success/20 text-success border-success/30" },
};

function SortableItem({ post, variant }: { post: Post; variant: "dev" | "other" | "done" }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: post.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  if (variant === "dev") {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-1 rounded-lg border border-warning/20 bg-warning/5 px-2 py-2">
        <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <Circle className="h-3 w-3 text-warning-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground truncate">{post.title}</span>
      </div>
    );
  }

  if (variant === "done") {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-1 rounded-lg border border-success/20 bg-success/5 px-2 py-2">
        <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0">
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-success">
          <Check className="h-2.5 w-2.5 text-success-foreground" />
        </div>
        <span className="text-sm font-medium text-muted-foreground line-through truncate">{post.title}</span>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[post.status] || STATUS_LABELS.entrada;
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1 rounded-lg border bg-card px-2 py-2">
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium text-foreground truncate flex-1">{post.title}</span>
      <Badge variant="outline" className={cn("text-[10px] shrink-0", statusInfo.className)}>
        {statusInfo.label}
      </Badge>
    </div>
  );
}

export const TrackingPanel = ({ clientId, posts, isAdmin = false, visibleToClient, onToggleVisibility, onReorderPosts }: TrackingPanelProps) => {
  const [orderedPosts, setOrderedPosts] = useState<Post[]>(posts);

  useEffect(() => {
    setOrderedPosts(posts);
  }, [posts]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const inDevPosts = orderedPosts.filter((p) => p.status === "em_desenvolvimento");
  const finalizedPosts = orderedPosts.filter((p) => p.status === "finalizado");
  const otherPosts = orderedPosts.filter((p) => p.status !== "em_desenvolvimento" && p.status !== "finalizado");

  const allIds = orderedPosts.map((p) => p.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedPosts((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      onReorderPosts?.(newOrder.map((p) => p.id));
      return newOrder;
    });
  };

  return (
    <div className="w-80 shrink-0 rounded-xl border bg-gradient-to-b from-card to-card/80 p-4 shadow-sm">
      {/* Header */}
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

      <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
            {/* Em Desenvolvimento section */}
            {inDevPosts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code2 className="h-3.5 w-3.5 text-warning-foreground" />
                  <span className="text-xs font-bold text-warning-foreground uppercase tracking-wide">Em Desenvolvimento</span>
                  <span className="text-[10px] text-muted-foreground">({inDevPosts.length})</span>
                </div>
                <div className="space-y-1">
                  {inDevPosts.map((post) => (
                    <SortableItem key={post.id} post={post} variant="dev" />
                  ))}
                </div>
              </div>
            )}

            {/* Other posts */}
            {otherPosts.length > 0 && (
              <div>
                {inDevPosts.length > 0 && (
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Outros</span>
                )}
                <div className="space-y-1">
                  {otherPosts.map((post) => (
                    <SortableItem key={post.id} post={post} variant="other" />
                  ))}
                </div>
              </div>
            )}

            {/* Finalized posts */}
            {finalizedPosts.length > 0 && (
              <div>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Finalizados</span>
                <div className="space-y-1">
                  {finalizedPosts.map((post) => (
                    <SortableItem key={post.id} post={post} variant="done" />
                  ))}
                </div>
              </div>
            )}
          </SortableContext>
        </DndContext>

        {posts.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Nenhum post para acompanhar</p>
        )}
      </div>
    </div>
  );
};
