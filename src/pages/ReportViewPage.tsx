import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  SocialReport, SocialReportMetrics, METRIC_LABELS, useUpdateReport
} from "@/hooks/useSocialReports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MobileNav } from "@/components/MobileNav";
import UserProfileMenu from "@/components/UserProfileMenu";
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus, Instagram, Facebook,
  Calendar, Pencil, Star, AlertTriangle, Lightbulb, BarChart3,
  Eye, MessageSquareText, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

interface Client { id: string; name: string; logo_url: string; }

function MetricCard({ label, current, previous }: { label: string; current?: number; previous?: number }) {
  const curr = current ?? 0;
  const prev = previous ?? 0;
  const diff = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="flex items-end justify-between gap-2">
          <p className="text-2xl font-bold tabular-nums">{curr.toLocaleString("pt-BR")}</p>
          {prev > 0 && (
            <span className={cn(
              "flex items-center gap-0.5 text-xs font-semibold rounded-full px-1.5 py-0.5",
              isUp && "text-emerald-600 bg-emerald-500/10",
              isDown && "text-red-500 bg-red-500/10",
              !isUp && !isDown && "text-muted-foreground bg-muted"
            )}>
              {isUp ? <ArrowUpRight className="h-3 w-3" /> : isDown ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {Math.abs(diff).toFixed(1)}%
            </span>
          )}
        </div>
        {prev > 0 && (
          <p className="text-[10px] text-muted-foreground">Anterior: {prev.toLocaleString("pt-BR")}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ReportViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const updateReport = useUpdateReport();
  const [report, setReport] = useState<SocialReport | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;
      const { data } = await supabase.from("social_reports").select("*").eq("id", id).single();
      if (data) {
        const r = data as unknown as SocialReport;
        setReport(r);
        const { data: c } = await supabase.from("clients").select("id, name, logo_url").eq("id", r.client_id).single();
        if (c) setClient(c as Client);
      }
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!report) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Relatório não encontrado</div>;

  const metrics = (typeof report.metrics === "object" ? report.metrics : {}) as SocialReportMetrics;
  const prevMetrics = (typeof report.previous_metrics === "object" ? report.previous_metrics : {}) as SocialReportMetrics;
  const metricKeys = Object.keys(metrics).filter(k => metrics[k] !== undefined && metrics[k] !== null);

  const PlatformIcon = report.platform === "instagram" ? Instagram : Facebook;

  // Chart data
  const chartData = metricKeys.map(key => ({
    name: METRIC_LABELS[key] || key,
    current: metrics[key] ?? 0,
    previous: prevMetrics[key] ?? 0,
  }));

  const handlePublish = async () => {
    if (!report) return;
    await updateReport.mutateAsync({ id: report.id, status: "published" });
    setReport({ ...report, status: "published" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass-header">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <MobileNav title="Relatório" />
            <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              {client?.logo_url && <img src={client.logo_url} alt="" className="h-7 w-7 rounded-full object-cover" />}
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate">{report.title || "Relatório"}</h1>
                <p className="text-[11px] text-muted-foreground">{client?.name}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report.status === "draft" && (
              <Button size="sm" className="h-8 text-xs" onClick={handlePublish}>Publicar</Button>
            )}
            <UserProfileMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 md:px-6 space-y-6">
        {/* Period & Platform */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="gap-1.5">
            <PlatformIcon className="h-3.5 w-3.5" />
            {report.platform === "instagram" ? "Instagram" : "Facebook"}
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {format(new Date(report.period_start), "dd MMM", { locale: ptBR })} – {format(new Date(report.period_end), "dd MMM yyyy", { locale: ptBR })}
          </Badge>
          <Badge variant="secondary" className={cn(
            report.status === "published" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
          )}>
            {report.status === "published" ? "Publicado" : "Rascunho"}
          </Badge>
        </div>

        {/* Strategic Comment */}
        {report.strategic_comment && (
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">Análise Estratégica</h3>
                  <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{report.strategic_comment}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metric Cards */}
        {metricKeys.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Métricas Principais
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {metricKeys.map(key => (
                <MetricCard
                  key={key}
                  label={METRIC_LABELS[key] || key}
                  current={metrics[key]}
                  previous={prevMetrics[key]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && chartData.some(d => d.previous > 0) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Comparação com Período Anterior</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="previous" name="Anterior" fill="hsl(var(--muted-foreground))" opacity={0.4} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="current" name="Atual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" />Anterior</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Atual</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Analysis */}
        {(report.best_content || report.worst_content || report.best_format) && (
          <div className="grid gap-3 md:grid-cols-3">
            {report.best_content && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold">Melhor Conteúdo</span>
                  </div>
                  <p className="text-sm text-foreground/80">{report.best_content}</p>
                </CardContent>
              </Card>
            )}
            {report.worst_content && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-xs font-semibold">Pior Conteúdo</span>
                  </div>
                  <p className="text-sm text-foreground/80">{report.worst_content}</p>
                </CardContent>
              </Card>
            )}
            {report.best_format && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-semibold">Melhor Formato</span>
                  </div>
                  <p className="text-sm text-foreground/80">{report.best_format}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Observations */}
        {report.observations && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Observações
              </h3>
              <p className="text-sm text-foreground/80 whitespace-pre-line">{report.observations}</p>
            </CardContent>
          </Card>
        )}

        {/* Recommendations */}
        {report.recommendations && (
          <Card className="border-amber-500/20 bg-amber-500/[0.02]">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-amber-500/10 p-2">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">Recomendações e Próximos Passos</h3>
                  <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{report.recommendations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
