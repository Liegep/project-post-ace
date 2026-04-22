import { useNavigate } from "react-router-dom";
import { useSocialReports, METRIC_LABELS } from "@/hooks/useSocialReports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileBarChart, ArrowRight, Instagram, Facebook, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PLATFORM_ICON: Record<string, React.ElementType> = {
  instagram: Instagram,
  facebook: Facebook,
};

export function RecentReportsWidget() {
  const navigate = useNavigate();
  const { data: reports = [], isLoading } = useSocialReports();

  const recent = reports.slice(0, 4);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4 animate-pulse">
        <div className="h-5 w-40 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (recent.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <FileBarChart className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground">Relatórios Recentes</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {reports.length}
          </span>
        </div>
        <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate("/reports")}>
          Ver todos <ArrowRight className="ml-1 h-3 w-3 text-primary-foreground" />
        </Button>
      </div>

      <div className="space-y-2">
        {recent.map((r) => {
          const PlatformIcon = PLATFORM_ICON[r.platform] || FileBarChart;
          const isDraft = r.status === "draft";
          const metrics = r.metrics || {};
          const prevMetrics = r.previous_metrics || {};
          const reachChange = metrics.reach && prevMetrics.reach
            ? ((metrics.reach - prevMetrics.reach) / prevMetrics.reach) * 100
            : null;

          return (
            <button
              key={r.id}
              onClick={() => navigate(`/reports/${r.id}`)}
              className="w-full flex items-center gap-3 rounded-lg border bg-background p-3 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <PlatformIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-foreground">
                  {r.title || "Relatório sem título"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(r.period_start), "dd MMM", { locale: ptBR })} – {format(new Date(r.period_end), "dd MMM yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {reachChange !== null && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${reachChange > 0 ? "text-emerald-600" : reachChange < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                    {reachChange > 0 ? <TrendingUp className="h-3 w-3" /> : reachChange < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {Math.abs(reachChange).toFixed(0)}%
                  </span>
                )}
                <Badge variant={isDraft ? "secondary" : "default"} className="text-[10px] px-1.5">
                  {isDraft ? "Rascunho" : "Publicado"}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
