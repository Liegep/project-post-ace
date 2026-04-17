import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanScrollWrapperProps {
  children: ReactNode;
  className?: string;
  /**
   * When true, makes the wrapper fill its parent height and prevents
   * vertical page scroll: each column should manage its own internal scroll.
   */
  fillHeight?: boolean;
}

export function KanbanScrollWrapper({ children, className, fillHeight }: KanbanScrollWrapperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0, moved: false });

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.6;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  // Click & drag
  const onPointerDown = (e: React.PointerEvent) => {
    // Only left mouse / primary touch
    if (e.button !== 0) return;
    // Don't interfere with interactive elements or dnd-kit
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, [data-dnd-kit-draggable], [role='button']")) return;

    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { startX: e.clientX, scrollLeft: el.scrollLeft, moved: false };
    setIsDragging(true);
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 3) dragState.current.moved = true;
    const el = scrollRef.current;
    if (el) el.scrollLeft = dragState.current.scrollLeft - dx;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const el = scrollRef.current;
    if (el) el.releasePointerCapture(e.pointerId);
  };

  const arrowBase =
    "absolute top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-background/60 backdrop-blur-md border border-border/50 shadow-lg text-foreground/70 hover:text-foreground hover:bg-background/80 transition-all duration-200 cursor-pointer";

  return (
    <div className={cn("relative group/kanban", className)}>
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className={cn(arrowBase, "left-2 opacity-0 group-hover/kanban:opacity-100")}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className={cn(arrowBase, "right-2 opacity-0 group-hover/kanban:opacity-100")}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Scrollable area */}
      <div
        ref={scrollRef}
        className={cn(
          "kanban-scroll flex gap-4 overflow-x-auto pb-4",
          fillHeight && "h-full items-stretch",
          isDragging && "cursor-grabbing select-none"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}
