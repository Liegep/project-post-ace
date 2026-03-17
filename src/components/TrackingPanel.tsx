import { Post } from "@/types/post";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, Code2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrackingPanelProps {
  clientId: string;
  posts: Post[];
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
};

export const TrackingPanel = ({ clientId, posts, isAdmin = false, visibleToClient, onToggleVisibility }: TrackingPanelProps) => {
  const inDevPosts = posts.filter((p) => p.status === "em_desenvolvimento");
  const finalizedPosts = posts.filter((p) => p.status === "finalizado");
  const otherPosts = posts.filter((p) => p.status !== "em_desenvolvimento" && p.status !== "finalizado");

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
                <div key={post.id} className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
                  <Circle className="h-3 w-3 text-warning-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{post.title}</span>
                </div>
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
              {otherPosts.map((post) => {
                const statusInfo = STATUS_LABELS[post.status] || STATUS_LABELS.entrada;
                return (
                  <div key={post.id} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
                    <Circle className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate flex-1">{post.title}</span>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", statusInfo.className)}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Finalized posts */}
        {finalizedPosts.length > 0 && (
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 block">Finalizados</span>
            <div className="space-y-1">
              {finalizedPosts.map((post) => (
                <div key={post.id} className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-success">
                    <Check className="h-2.5 w-2.5 text-success-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground line-through truncate">{post.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {posts.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Nenhum post para acompanhar</p>
        )}
      </div>
    </div>
  );
};
