import { METRIC_LABELS, SocialReportMetrics } from "@/hooks/useSocialReports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";
import { BarChart3 } from "lucide-react";
import { getReportT } from "@/i18n/reportTranslations";

interface ReportChartsProps {
  metrics: SocialReportMetrics;
  prevMetrics: SocialReportMetrics;
  locale?: string;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 100%, 60%)",
  "hsl(280, 80%, 60%)",
  "hsl(330, 80%, 60%)",
  "hsl(160, 70%, 50%)",
  "hsl(45, 90%, 55%)",
  "hsl(15, 80%, 55%)",
  "hsl(200, 70%, 55%)",
  "hsl(260, 60%, 55%)",
  "hsl(120, 50%, 50%)",
];

export function ReportCharts({ metrics, prevMetrics, locale }: ReportChartsProps) {
  const t = getReportT(locale);
  const labelFor = (k: string) => t.metricLabels[k] || METRIC_LABELS[k] || k;
  const keys = Object.keys(metrics).filter(k => metrics[k] !== undefined && metrics[k] !== null);
  if (keys.length === 0) return null;

  const barData = keys.map(k => ({
    name: labelFor(k),
    atual: metrics[k] ?? 0,
    anterior: prevMetrics[k] ?? 0,
  }));

  const hasPrev = barData.some(d => d.anterior > 0);

  const pieData = keys.map((k, i) => ({
    name: labelFor(k),
    value: metrics[k] ?? 0,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })).filter(d => d.value > 0);

  const variationData = keys.map(k => {
    const curr = metrics[k] ?? 0;
    const prev = prevMetrics[k] ?? 0;
    const pct = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
    return { name: labelFor(k), value: parseFloat(pct.toFixed(1)) };
  });

  const tooltipStyle = {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    fontSize: "11px",
    backdropFilter: "blur(12px)",
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" /> Visualização de Dados
      </h3>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Bar Chart */}
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Métricas {hasPrev ? "vs Anterior" : ""}</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, left: -20, bottom: 50 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-40} textAnchor="end" />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  {hasPrev && <Bar dataKey="anterior" name="Anterior" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[4, 4, 0, 0]} />}
                  <Bar dataKey="atual" name="Atual" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        {pieData.length > 1 && (
          <Card className="glass-card border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Distribuição</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Variation Area Chart */}
      {hasPrev && (
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Variação Percentual (%)</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={variationData} margin={{ top: 8, right: 16, left: -10, bottom: 50 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-40} textAnchor="end" />
                  <YAxis tick={{ fontSize: 9 }} unit="%" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Variação"]} />
                  <Area type="monotone" dataKey="variação" stroke="hsl(var(--primary))" fill="url(#areaGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
