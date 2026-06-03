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

  // Click & drag — defer pointer capture until the user actually drags
  // so simple clicks on cards aren't swallowed by the wrapper.
  const DRAG_THRESHOLD = 5;
  const pendingDrag = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if (e.pointerType !== "mouse") return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, [data-dnd-kit-draggable], [role='button']")) return;

    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { startX: e.clientX, scrollLeft: el.scrollLeft, moved: false };
    pendingDrag.current = true;
    // Do NOT capture pointer yet — wait for real movement so click events still fire on cards.
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pendingDrag.current && !isDragging) return;
    const dx = e.clientX - dragState.current.startX;
    if (!isDragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      const el = scrollRef.current;
      if (!el) return;
      setIsDragging(true);
      dragState.current.moved = true;
      try { el.setPointerCapture(e.pointerId); } catch {}
    }
    const el = scrollRef.current;
    if (el) el.scrollLeft = dragState.current.scrollLeft - dx;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pendingDrag.current = false;
    if (!isDragging) return;
    setIsDragging(false);
    const el = scrollRef.current;
    if (el) {
      try { el.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  const arrowBase =
    "absolute top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-background/60 backdrop-blur-md border border-border/50 shadow-lg text-foreground/70 hover:text-foreground hover:bg-background/80 transition-all duration-200 cursor-pointer";

  return (
    <div className={cn("relative group/kanban", fillHeight && "h-full flex flex-col min-h-0", className)}>
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className={cn(arrowBase, "left-2 opacity-0 group-hover/kanban:opacity-100")}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-primary-foreground" />
        </button>
      )}

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className={cn(arrowBase, "right-2 opacity-0 group-hover/kanban:opacity-100")}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-primary-foreground" />
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
