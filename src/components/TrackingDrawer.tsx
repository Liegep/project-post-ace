import { useState } from "react";
import { Post, Tag } from "@/types/post";
import { TrackingPanel } from "@/components/TrackingPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X, BarChart3 } from "lucide-react";

interface TrackingDrawerProps {
  clientId: string;
  posts: Post[];
  columns?: { id: string; name: string }[];
  tags?: Tag[];
  isAdmin?: boolean;
  visibleToClient?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
}

export const TrackingDrawer = (props: TrackingDrawerProps) => {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const itemCount = props.posts.length;

  // Mobile: use Sheet overlay
  if (isMobile) {
    return (
      <>
        {/* Floating tab button */}
        <button
          onClick={() => setOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1 rounded-r-xl border border-l-0 bg-card px-2 py-3 shadow-lg transition-all hover:px-3 group"
        >
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground writing-vertical hidden">
            Acompanhamento
          </span>
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
              {itemCount}
            </span>
          )}
        </button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-[340px] max-w-[85vw] p-0 flex flex-col">
            <SheetHeader className="px-4 pt-4 pb-2 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle className="flex items-center gap-2 text-base">
                  📊 Acompanhamento
                  {itemCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {itemCount}
                    </span>
                  )}
                </SheetTitle>
              </div>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <TrackingPanelInline {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: collapsible side panel
  return (
    <div
      className={cn(
        "relative shrink-0 transition-all duration-300 ease-in-out",
        open ? "w-80" : "w-0"
      )}
    >
      {/* Tab trigger (visible when closed) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute left-0 top-8 z-10 flex items-center gap-1.5 rounded-r-xl border border-l-0 bg-card px-2 py-3 shadow-md transition-all hover:px-3 hover:shadow-lg group"
        >
          <BarChart3 className="h-4 w-4 text-primary" />
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
          {itemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
              {itemCount}
            </span>
          )}
        </button>
      )}

      {/* Panel content */}
      <div
        className={cn(
          "h-full overflow-hidden transition-all duration-300 ease-in-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="w-80 rounded-xl border bg-gradient-to-b from-card to-card/80 shadow-sm flex flex-col max-h-[calc(100vh-200px)]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              📊 Acompanhamento
              {itemCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {itemCount}
                </span>
              )}
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Recolher"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4">
            <TrackingPanelInline {...props} />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Inline version of TrackingPanel content — reuses TrackingPanel
 * but renders it without the outer container (we provide our own).
 */
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
