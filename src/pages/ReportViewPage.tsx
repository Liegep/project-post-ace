import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  SocialReport, SocialReportMetrics, useUpdateReport
} from "@/hooks/useSocialReports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MobileNav } from "@/components/MobileNav";
import UserProfileMenu from "@/components/UserProfileMenu";
import { ReportCharts } from "@/components/reports/ReportCharts";
import {
  ArrowLeft, TrendingUp, Minus, Instagram, Facebook,
  Calendar, Star, AlertTriangle, Lightbulb, BarChart3,
  Eye, MessageSquareText, ArrowUpRight, ArrowDownRight, Send, Check
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { getReportT, getReportDateLocale, getReportNumberLocale } from "@/i18n/reportTranslations";

interface Client { id: string; name: string; logo_url: string; }

function MetricCard({ label, current, previous, numberLocale, prevLabel }: { label: string; current?: number; previous?: number; numberLocale: string; prevLabel: string }) {
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
          <p className="text-2xl font-bold tabular-nums">{curr.toLocaleString(numberLocale)}</p>
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
          <p className="text-[10px] text-muted-foreground">{prevLabel}: {prev.toLocaleString(numberLocale)}</p>
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

  const t = getReportT(report?.locale);
  const dateLocale = getReportDateLocale(report?.locale);
  const numberLocale = getReportNumberLocale(report?.locale);

  if (!report) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">{t.notFound}</div>;

  const metrics = (typeof report.metrics === "object" ? report.metrics : {}) as SocialReportMetrics;
  const prevMetrics = (typeof report.previous_metrics === "object" ? report.previous_metrics : {}) as SocialReportMetrics;
  const metricKeys = Object.keys(metrics).filter(k => metrics[k] !== undefined && metrics[k] !== null);

  const PlatformIcon = report.platform === "instagram" ? Instagram : Facebook;


  const handlePublish = async () => {
    if (!report) return;
    await updateReport.mutateAsync({ id: report.id, status: "published" });
    setReport({ ...report, status: "published" });
    toast({ title: "Relatório publicado e disponível para o cliente!" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass-header">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <MobileNav title={t.report} />
            <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
              <ArrowLeft className="h-4 w-4 text-primary-foreground" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              {client?.logo_url && <img src={client.logo_url} alt="" className="h-7 w-7 rounded-full object-cover" />}
              <div className="min-w-0">
                <h1 className="text-sm font-semibold truncate">{report.title || t.report}</h1>
                <p className="text-[11px] text-muted-foreground">{client?.name}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report.status === "draft" && (
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-gradient-to-r from-primary to-accent hover:opacity-90" onClick={handlePublish}>
                <Send className="h-3.5 w-3.5" /> {t.publishAndSend}
              </Button>
            )}
            {report.status === "published" && (
              <Badge className="bg-emerald-500/15 text-emerald-600 gap-1">
                <Check className="h-3 w-3" /> {t.sentToClient}
              </Badge>
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
            {format(new Date(report.period_start), "dd MMM", { locale: dateLocale })} – {format(new Date(report.period_end), "dd MMM yyyy", { locale: dateLocale })}
          </Badge>
          <Badge variant="secondary" className={cn(
            report.status === "published" ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
          )}>
            {report.status === "published" ? t.published : t.draft}
          </Badge>
        </div>

        {/* Parse observations + top content once */}
        {(() => null)()}
        {(() => {
          // no-op; actual parsing happens inline below
          return null;
        })()}

        {/* Observations (moved to top) */}
        {(() => {
          if (!report.observations) return null;
          let parsedText = "";
          try {
            const parsed = JSON.parse(report.observations);
            parsedText = (parsed && typeof parsed === "object" && "text" in parsed)
              ? (parsed.text || "")
              : report.observations;
          } catch {
            parsedText = report.observations;
          }
          if (!parsedText) return null;
          return (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-semibold mb-2 flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" /> {t.observations}
                </h3>
                <p className="text-sm text-foreground/80 whitespace-pre-line">{parsedText}</p>
              </CardContent>
            </Card>
          );
        })()}

        {/* Strategic Comment */}
        {report.strategic_comment && (
          <Card className="border-primary/20 bg-primary/[0.02]">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">{t.strategicAnalysis}</h3>
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
              <BarChart3 className="h-4 w-4 text-primary" /> {t.mainMetrics}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {metricKeys.map(key => (
                <MetricCard
                  key={key}
                  label={t.metricLabels[key] || key}
                  current={metrics[key]}
                  previous={prevMetrics[key]}
                  numberLocale={numberLocale}
                  prevLabel={t.previous}
                />
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        <ReportCharts metrics={metrics} prevMetrics={prevMetrics} locale={report?.locale} />

        {/* Content Analysis */}
        {(report.best_content || report.worst_content || report.best_format) && (
          <div className="grid gap-3 md:grid-cols-3">
            {report.best_content && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold">{t.bestContent}</span>
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
                    <span className="text-xs font-semibold">{t.worstContent}</span>
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
                    <span className="text-xs font-semibold">{t.bestFormat}</span>
                  </div>
                  <p className="text-sm text-foreground/80">{report.best_format}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Observations + Top Content (Posts / Reels / Stories) */}
        {(() => {
          if (!report.observations) return null;
          let parsedText = "";
          let topContent: { posts?: any[]; reels?: any[]; stories?: any[] } | null = null;
          try {
            const parsed = JSON.parse(report.observations);
            if (parsed && typeof parsed === "object" && ("text" in parsed || "top_content" in parsed)) {
              parsedText = parsed.text || "";
              topContent = parsed.top_content || null;
            } else {
              parsedText = report.observations;
            }
          } catch {
            parsedText = report.observations;
          }

          const sections: { key: "posts" | "reels" | "stories"; label: string }[] = [
            { key: "posts", label: t.topPosts },
            { key: "reels", label: t.topReels },
            { key: "stories", label: t.topStories },
          ];

          const hasTopContent =
            topContent &&
            sections.some((s) =>
              (topContent![s.key] || []).some((it: any) => it?.image_url || it?.title),
            );

          return (
            <>

              {hasTopContent && (
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Star className="h-4 w-4 text-primary" /> {t.topResultsTitle}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {sections.map((section) => {
                      const items = (topContent![section.key] || []).filter(
                        (it: any) => it?.image_url || it?.title,
                      );
                      if (items.length === 0) return null;
                      return (
                        <div key={section.key} className="space-y-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {section.label}
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {items.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="rounded-lg border border-border/50 bg-background/40 overflow-hidden"
                              >
                                {item.image_url && (
                                  <div className="aspect-[4/5] w-full overflow-hidden bg-muted/40">
                                    <img
                                      src={item.image_url}
                                      alt={item.title || `${section.key} ${idx + 1}`}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                )}
                                {item.title && (
                                  <p className="px-3 py-2 text-xs font-medium text-foreground/80">
                                    {item.title}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </>
          );
        })()}

        {/* Recommendations */}
        {report.recommendations && (
          <Card className="border-amber-500/20 bg-amber-500/[0.02]">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-amber-500/10 p-2">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">{t.recommendations}</h3>
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
