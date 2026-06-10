import { useState, useEffect } from "react";
import { Post, Tag } from "@/types/post";
import { TrackingPanel } from "@/components/TrackingPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BarChart3, Pin, PinOff, X } from "lucide-react";

interface TrackingDrawerProps {
  clientId: string;
  posts: Post[];
  columns?: { id: string; name: string }[];
  tags?: Tag[];
  isAdmin?: boolean;
  visibleToClient?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
  trackingColumnIds?: string[];
  onChangeTrackingColumnIds?: (ids: string[]) => void;
}

const PINNED_KEY = "tracking-drawer-pinned";

export const TrackingDrawer = (props: TrackingDrawerProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(() => {
    try {
      return localStorage.getItem(PINNED_KEY) === "true";
    } catch {
      return false;
    }
  });

  // For client view, filter posts by selected tracking columns (if any configured)
  const filteredPosts = (() => {
    if (props.isAdmin) return props.posts;
    const ids = props.trackingColumnIds || [];
    if (ids.length === 0) return props.posts;
    return props.posts.filter((p) => p.columnId && ids.includes(p.columnId));
  })();
  const effectiveProps = { ...props, posts: filteredPosts };

  const itemCount = filteredPosts.length;

  // Sync pinned state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(PINNED_KEY, String(pinned));
    } catch {}
  }, [pinned]);

  // On mobile, never pin
  const effectivePinned = !isMobile && pinned;

  const togglePin = () => {
    if (isMobile) return;
    setPinned((prev) => !prev);
  };

  // Floating trigger button
  const TriggerButton = () => (
    <button
      onClick={() => setOpen(true)}
      className={cn(
        "fixed z-40 flex items-center gap-2 shadow-lg transition-all duration-200",
        "bg-card border rounded-l-xl px-3 py-3 hover:px-4 hover:shadow-xl group",
        "right-0 top-1/3",
      )}
      title="Acompanhamento"
    >
      <BarChart3 className="h-4 w-4 text-primary" />
      <span className="text-xs font-semibold text-foreground hidden sm:inline">
        Acompanhamento
      </span>
      {itemCount > 0 && (
        <span className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
          {itemCount}
        </span>
      )}
    </button>
  );

  // Pinned mode: inline panel on the right
  if (effectivePinned) {
    return (
      <div className="fixed right-0 top-16 z-30 flex h-[calc(100vh-4rem)] w-80 flex-col border-l bg-card shadow-lg animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            Acompanhamento
            {itemCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {itemCount}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={togglePin}
              className="rounded-md p-1.5 text-primary hover:bg-primary/10 transition-colors"
              title="Desafixar"
            >
              <PinOff className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setPinned(false); setOpen(false); }}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <TrackingPanelInline {...effectiveProps} />
        </div>
      </div>
    );
  }

  return (
    <>
      {!open && <TriggerButton />}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            "p-0 flex flex-col",
            isMobile ? "w-[340px] max-w-[85vw]" : "w-[360px]"
          )}
        >
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-sm font-bold">
                <BarChart3 className="h-4 w-4 text-primary" />
                Acompanhamento
                {itemCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {itemCount}
                  </span>
                )}
              </SheetTitle>
              {!isMobile && (
                <button
                  onClick={togglePin}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Fixar na tela"
                >
                  <Pin className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <TrackingPanelInline {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

const TrackingPanelInline = (props: TrackingDrawerProps) => {
  return (
    <div className="[&>div]:w-full [&>div]:border-0 [&>div]:bg-transparent [&>div]:p-0 [&>div]:shadow-none [&>div>div:first-child]:hidden">
      <TrackingPanel
        clientId={props.clientId}
        posts={props.posts}
        columns={props.columns}
        tags={props.tags}
        isAdmin={props.isAdmin}
        visibleToClient={props.visibleToClient}
        onToggleVisibility={props.onToggleVisibility}
      />
    </div>
  );
};
