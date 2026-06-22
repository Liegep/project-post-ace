import { useState, useEffect, useCallback } from "react";
import { StickyNote, Link as LinkIcon, X, Copy, ExternalLink, NotebookPen } from "lucide-react";
import { GradientHeartIcon } from "@/components/GradientHeartIcon";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ClientNotes } from "@/components/ClientNotes";
import { ClientLinksPanel } from "@/components/ClientLinksPanel";
import { QuickLinksPanel } from "@/components/QuickLinksPanel";
import { QuickDraftNotes } from "@/components/QuickDraftNotes";

type Tab = "notes" | "drafts" | "links" | "quick" | null;

interface Props {
  clientId: string;
}

// Use Sheet (drawer) on anything below desktop (lg = 1024px) to avoid the
// fixed side panel covering kanban content on tablets.
function useUseSheet() {
  const [useSheet, setUseSheet] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < 1024 : false
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setUseSheet(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return useSheet;
}

export function ClientRightSidebar({ clientId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [draftsCount, setDraftsCount] = useState(0);
  const [linksCount, setLinksCount] = useState(0);
  const isMobile = useUseSheet();

  const open = activeTab !== null;

  const handleTabClick = useCallback((tab: Tab) => {
    setActiveTab(prev => prev === tab ? null : tab);
  }, []);

  const close = useCallback(() => setActiveTab(null), []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, close]);

  const tabs = [
    {
      id: "notes" as const,
      label: "Recados",
      icon: StickyNote,
      count: notesCount,
      color: "bg-amber-500",
      hoverColor: "hover:bg-amber-400",
      textColor: "text-amber-500",
      bgLight: "bg-amber-50 dark:bg-amber-500/10",
    },
    {
      id: "drafts" as const,
      label: "Rascunhos",
      icon: NotebookPen,
      count: draftsCount,
      color: "bg-yellow-500",
      hoverColor: "hover:bg-yellow-400",
      textColor: "text-yellow-600",
      bgLight: "bg-yellow-50 dark:bg-yellow-500/10",
    },
    {
      id: "links" as const,
      label: "Links",
      icon: LinkIcon,
      count: linksCount,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-400",
      textColor: "text-blue-500",
      bgLight: "bg-blue-50 dark:bg-blue-500/10",
    },
    {
      id: "quick" as const,
      label: "Rápidos",
      icon: GradientHeartIcon,
      count: 0,
      color: "bg-transparent",
      hoverColor: "hover:bg-emerald-500 hover:text-white",
      textColor: "text-foreground",
      bgLight: "bg-muted/40",
    },
  ];

  const headerBg = activeTab === "notes"
    ? "bg-amber-50 dark:bg-amber-500/10"
    : activeTab === "drafts"
    ? "bg-yellow-50 dark:bg-yellow-500/10"
    : activeTab === "links"
    ? "bg-blue-50 dark:bg-blue-500/10"
    : "opacity-60 bg-lime-100";

  const headerIcon = activeTab === "notes"
    ? <StickyNote className="h-5 w-5 text-amber-500" />
    : activeTab === "drafts"
    ? <NotebookPen className="h-5 w-5 text-yellow-600" />
    : activeTab === "links"
    ? <LinkIcon className="h-5 w-5 text-blue-500" />
    : <GradientHeartIcon className="h-5 w-5" />;

  const headerTitle = activeTab === "notes"
    ? "Recados"
    : activeTab === "drafts"
    ? "Rascunhos"
    : activeTab === "links"
    ? "Links do Cliente"
    : "Links Rápidos";

  // Mobile: use Sheet
  if (isMobile) {
    return (
      <>
        {/* Floating tabs on the right edge */}
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "flex items-center gap-1 rounded-l-xl px-2 py-3 shadow-lg transition-all duration-200",
                "border border-r-0 border-border/50 backdrop-blur-sm",
                activeTab === tab.id
                  ? `${tab.color} text-white`
                  : "bg-card/95 text-muted-foreground hover:text-foreground hover:shadow-xl"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                  activeTab === tab.id ? "bg-white/30 text-white" : `${tab.color} text-white`
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <Sheet open={open} onOpenChange={(v) => !v && close()}>
          <SheetContent side="right" className="w-full sm:w-[380px] p-0 bg-card">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className={cn("flex items-center justify-between px-5 py-4 border-b", headerBg)}>
                <div className="flex items-center gap-2">
                  {headerIcon}
                  <h2 className="font-semibold text-foreground">{headerTitle}</h2>
                </div>
                <button onClick={close} className="rounded-full p-1.5 hover:bg-black/10 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Tab switcher */}
              <div className="flex border-b">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
                      activeTab === tab.id
                        ? `border-b-2 ${tab.textColor}`
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    style={activeTab === tab.id ? { borderColor: "currentColor" } : undefined}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white", tab.color)}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "notes" && (
                  <ClientNotes clientId={clientId} onCountChange={setNotesCount} />
                )}
                {activeTab === "links" && (
                  <ClientLinksPanel clientId={clientId} onCountChange={setLinksCount} />
                )}
                {activeTab === "quick" && <QuickLinksPanel />}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: overlay panel
  return (
    <>
      {/* Backdrop when open */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
          onClick={close}
        />
      )}

      {/* Fixed tabs on the right edge */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "group flex items-center gap-2 rounded-l-xl pl-3 pr-2 py-3 shadow-lg transition-all duration-200",
              "border border-r-0 border-border/50",
              activeTab === tab.id
                ? `${tab.color} text-white shadow-xl`
                : `bg-card text-muted-foreground ${tab.hoverColor} hover:text-white hover:shadow-xl`
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className={cn(
              "text-xs font-medium whitespace-nowrap transition-all duration-200 overflow-hidden",
              activeTab === tab.id ? "max-w-24 opacity-100" : "max-w-0 opacity-0 group-hover:max-w-24 group-hover:opacity-100"
            )}>
              {tab.label}
            </span>
            {tab.count > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                activeTab === tab.id ? "bg-white/30 text-white" : `${tab.color} text-white`
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-[380px] bg-card border-l shadow-2xl",
          "transition-transform duration-250 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className={cn("flex items-center justify-between px-5 py-4 border-b", headerBg)}>
            <div className="flex items-center gap-2">
              {headerIcon}
              <h2 className="font-semibold text-foreground">{headerTitle}</h2>
            </div>
            <button onClick={close} className="rounded-full p-1.5 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? `border-b-2 ${tab.textColor}`
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={activeTab === tab.id ? { borderColor: "currentColor" } : undefined}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white", tab.color)}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "notes" && (
              <ClientNotes clientId={clientId} onCountChange={setNotesCount} />
            )}
            {activeTab === "links" && (
              <ClientLinksPanel clientId={clientId} onCountChange={setLinksCount} />
            )}
            {activeTab === "quick" && <QuickLinksPanel />}
          </div>
        </div>
      </div>
    </>
  );
}
