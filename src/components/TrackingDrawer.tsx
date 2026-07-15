import { useState, useEffect } from "react";
import { Post, Tag } from "@/types/post";
import { TrackingPanel } from "@/components/TrackingPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BarChart3, Pin, PinOff, X, Filter, Eye, EyeOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

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
  locale?: string;
}

const TD_T: Record<string, { tracking: string; visibleColumns: string; visibleColumnsHelp: string; visibleToClient: string; hiddenFromClient: string; pin: string; unpin: string; close: string }> = {
  pt: { tracking: "Acompanhamento", visibleColumns: "Colunas visíveis para o cliente", visibleColumnsHelp: "{td.visibleColumnsHelp}", visibleToClient: "Visível para o cliente", hiddenFromClient: "Oculto para o cliente", pin: "Fixar na tela", unpin: "Desafixar", close: "Fechar" },
  en: { tracking: "Tracking", visibleColumns: "Columns visible to client", visibleColumnsHelp: "If nothing is selected, the client will see all columns.", visibleToClient: "Visible to client", hiddenFromClient: "Hidden from client", pin: "Pin to screen", unpin: "Unpin", close: "Close" },
  it: { tracking: "Monitoraggio", visibleColumns: "Colonne visibili al cliente", visibleColumnsHelp: "Se nulla è selezionato, il cliente vedrà tutte le colonne.", visibleToClient: "Visibile al cliente", hiddenFromClient: "Nascosto al cliente", pin: "Fissa allo schermo", unpin: "Sblocca", close: "Chiudi" },
  es: { tracking: "Seguimiento", visibleColumns: "Columnas visibles para el cliente", visibleColumnsHelp: "Si nada está seleccionado, el cliente verá todas las columnas.", visibleToClient: "Visible para el cliente", hiddenFromClient: "Oculto para el cliente", pin: "Fijar en pantalla", unpin: "Desfijar", close: "Cerrar" },
  sv: { tracking: "Uppföljning", visibleColumns: "Kolumner synliga för klienten", visibleColumnsHelp: "Om inget är valt ser klienten alla kolumner.", visibleToClient: "Synlig för klient", hiddenFromClient: "Dold för klient", pin: "Fäst på skärmen", unpin: "Lossa", close: "Stäng" },
};

const PINNED_KEY = "tracking-drawer-pinned";

export const TrackingDrawer = (props: TrackingDrawerProps) => {
  const td = TD_T[(props.locale as string) in TD_T ? (props.locale as string) : "pt"];
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

  // Admin controls shown in drawer header (filter + visibility)
  const AdminHeaderControls = () => {
    if (!props.isAdmin) return null;
    return (
      <>
        {props.onChangeTrackingColumnIds && (props.columns?.length ?? 0) > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "rounded-md p-1.5 border transition-colors",
                  (props.trackingColumnIds && props.trackingColumnIds.length > 0)
                    ? "text-primary border-primary/40 bg-primary/10 hover:bg-primary/20"
                    : "text-foreground border-border bg-background/60 hover:bg-muted"
                )}
                title={td.visibleColumns}
              >
                <Filter className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3 z-[60]">
              <div className="mb-2 text-xs font-semibold text-foreground">
                Colunas visíveis para o cliente
              </div>
              <div className="mb-2 text-[11px] text-muted-foreground">
                {td.visibleColumnsHelp}
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {(props.columns || []).map((col) => {
                  const selected = (props.trackingColumnIds || []).includes(col.id);
                  return (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 cursor-pointer rounded px-1.5 py-1 hover:bg-muted"
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={(checked) => {
                          const current = props.trackingColumnIds || [];
                          const next = checked
                            ? [...current, col.id]
                            : current.filter((id) => id !== col.id);
                          props.onChangeTrackingColumnIds?.(next);
                        }}
                      />
                      <span className="text-xs text-foreground truncate">{col.name}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {props.onToggleVisibility && (
          <button
            onClick={() => props.onToggleVisibility?.(!props.visibleToClient)}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              props.visibleToClient
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={props.visibleToClient ? td.visibleToClient : td.hiddenFromClient}
          >
            {props.visibleToClient ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        )}
      </>
    );
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
      title={td.tracking}
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
            <AdminHeaderControls />
            <button
              onClick={togglePin}
              className="rounded-md p-1.5 text-primary hover:bg-primary/10 transition-colors"
              title={td.unpin}
            >
              <PinOff className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setPinned(false); setOpen(false); }}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={td.close}
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
              <div className="flex items-center gap-1">
                <AdminHeaderControls />
                {!isMobile && (
                  <button
                    onClick={togglePin}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title={td.pin}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <TrackingPanelInline {...effectiveProps} />
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
        trackingColumnIds={props.trackingColumnIds}
        onChangeTrackingColumnIds={props.onChangeTrackingColumnIds}
      />
    </div>
  );
};
