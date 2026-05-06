import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, Star, GripVertical, ImagePlus } from "lucide-react";
import { MediaType } from "@/types/post";

export interface SortableMediaItem {
  id: string;
  url: string;
  type: MediaType;
  file?: File;
}

interface SortableMediaGridProps {
  items: SortableMediaItem[];
  coverIndex: number;
  onReorder: (items: SortableMediaItem[]) => void;
  onRemove: (index: number) => void;
  onSetCover: (index: number) => void;
  onAddMore: () => void;
  addLabel?: string;
  emptyLabel?: string;
}

const SortableItem = ({
  item,
  index,
  isCover,
  onRemove,
  onSetCover,
}: {
  item: SortableMediaItem;
  index: number;
  isCover: boolean;
  onRemove: () => void;
  onSetCover: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-lg border overflow-hidden aspect-square group ${
        isCover ? "ring-2 ring-accent" : ""
      } ${isDragging ? "shadow-lg ring-2 ring-primary" : ""}`}
    >
      {/* Draggable overlay area */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
      />

      {item.type === "video" ? (
        <video src={item.url} className="h-full w-full object-cover" muted />
      ) : (
        <img src={item.url} alt="Preview" className="h-full w-full object-cover" />
      )}

      {/* Drag indicator */}
      <div className="absolute top-1 left-1 rounded-full bg-background/80 p-1 shadow-sm">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>

      {/* Order number */}
      <div className="absolute top-1 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-bold text-foreground shadow-sm">
        {index + 1}
      </div>

      {/* Cover badge / button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSetCover();
        }}
        className={`absolute bottom-1 left-1 z-20 rounded-full px-1.5 py-0.5 text-[9px] font-semibold flex items-center gap-0.5 transition-opacity ${
          isCover
            ? "bg-accent text-accent-foreground opacity-100"
            : "bg-background/80 text-muted-foreground opacity-0 group-hover:opacity-100"
        }`}
        title="Definir como capa"
      >
        <Star className={`h-2.5 w-2.5 ${isCover ? "fill-current" : ""}`} />
        {isCover ? "Capa" : "Capa"}
      </button>

      {/* Remove button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1.5 right-1.5 z-20 rounded-full bg-white text-black p-1 shadow-md ring-1 ring-black/10 opacity-100 hover:bg-white hover:scale-110 transition-transform"
        aria-label="Remover"
        title="Remover"
      >
        <X className="h-4 w-4 stroke-[3]" />
      </button>
    </div>
  );
};

export const SortableMediaGrid = ({
  items,
  coverIndex,
  onReorder,
  onRemove,
  onSetCover,
  onAddMore,
  addLabel = "Adicionar mais",
  emptyLabel = "Clique para selecionar mídia",
}: SortableMediaGridProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);
    onReorder(newItems);
  };

  if (items.length === 0) {
    return (
      <button
        type="button"
        onClick={onAddMore}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-8 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
      >
        <ImagePlus className="h-5 w-5" />
        {emptyLabel}
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-2">
            {items.map((item, i) => (
              <SortableItem
                key={item.id}
                item={item}
                index={i}
                isCover={i === coverIndex}
                onRemove={() => onRemove(i)}
                onSetCover={() => onSetCover(i)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={onAddMore}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-3 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
      >
        <ImagePlus className="h-4 w-4" />
        {addLabel}
      </button>
    </div>
  );
};
