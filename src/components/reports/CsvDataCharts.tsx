import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import { LineChart as LineChartIcon, TrendingUp, BarChart3, Target, PieChart as PieChartIcon } from "lucide-react";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(210, 100%, 60%)",
  "hsl(280, 80%, 60%)",
  "hsl(330, 80%, 60%)",
  "hsl(160, 70%, 50%)",
  "hsl(45, 90%, 55%)",
  "hsl(15, 80%, 55%)",
];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  fontSize: "11px",
  backdropFilter: "blur(12px)",
};

export type MetricKey =
  | "reach" | "impressions" | "spend" | "interactions"
  | "clicks" | "profile_visits" | "followers_gained";

export interface CsvDataChartsProps {
  headers: string[];
  rows: Record<string, unknown>[];
  /** Mapping from canonical metric key -> CSV column name */
  mapping: Partial<Record<MetricKey, string>>;
  /** Detected date column name, if any */
  dateColumn?: string | null;
}

const LABELS: Record<MetricKey, string> = {
  reach: "Alcance",
  impressions: "Impressões",
  spend: "Investimento",
  interactions: "Interações",
  clicks: "Cliques",
  profile_visits: "Visitas ao Perfil",
  followers_gained: "Seguidores",
};

function toNumber(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  let s = String(raw).replace(/[R$€£\s]/gi, "").trim();
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDate(raw: unknown): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Try ISO first, then dd/mm/yyyy
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const day = parseInt(m[1]); const month = parseInt(m[2]) - 1;
    let year = parseInt(m[3]); if (year < 100) year += 2000;
    d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

/** Find a textual column with 2-15 unique values — useful for grouping (donut). */
function detectCategoryColumn(headers: string[], rows: Record<string, unknown>[], excludeCols: Set<string>): string | null {
  let best: { col: string; uniques: number } | null = null;
  for (const h of headers) {
    if (excludeCols.has(h)) continue;
    const values = new Set<string>();
    for (const r of rows) {
      const v = String(r[h] ?? "").trim();
      if (v && !/^-?[\d.,\s$R€£%-]+$/.test(v)) values.add(v);
      if (values.size > 20) break;
    }
    if (values.size >= 2 && values.size <= 15) {
      if (!best || values.size < best.uniques) best = { col: h, uniques: values.size };
    }
  }
  return best?.col ?? null;
}

export function CsvDataCharts({ headers, rows, mapping, dateColumn }: CsvDataChartsProps) {
  // Numeric rows: extract as { reach, impressions, spend, ... } per row using mapping
  const numericRows = useMemo(() => {
    return rows.map((r, idx) => {
      const out: Record<string, any> = { __idx: idx + 1 };
      (Object.keys(mapping) as MetricKey[]).forEach(k => {
        const col = mapping[k];
        if (col) out[k] = toNumber(r[col]);
      });
      return out;
    });
  }, [rows, mapping]);

  // Time series data
  const timeSeries = useMemo(() => {
    if (!dateColumn) return [];
    const buckets = new Map<string, Record<string, number>>();
    rows.forEach(r => {
      const d = parseDate(r[dateColumn]);
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      const bucket = buckets.get(key) || { reach: 0, impressions: 0, spend: 0, interactions: 0, clicks: 0 };
      (Object.keys(mapping) as MetricKey[]).forEach(k => {
        const col = mapping[k];
        if (col) bucket[k] = (bucket[k] || 0) + toNumber(r[col]);
      });
      buckets.set(key, bucket);
    });
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({
        date: date.slice(5), // MM-DD
        ...vals,
      }));
  }, [rows, dateColumn, mapping]);

  // Top 10 by spend
  const topBySpend = useMemo(() => {
    if (!mapping.spend) return [];
    const labelCol = headers.find(h => h !== mapping.spend && h !== mapping.reach && h !== mapping.impressions
      && rows.some(r => isNaN(Number(String(r[h]).replace(/[.,\s$R€£]/g, "")))));
    return [...numericRows]
      .filter(r => r.spend > 0)
      .sort((a, b) => (b.spend || 0) - (a.spend || 0))
      .slice(0, 10)
      .map((r, i) => ({
        name: labelCol ? String(rows[r.__idx - 1][labelCol] ?? `#${r.__idx}`).slice(0, 28) : `Linha ${r.__idx}`,
        spend: r.spend,
        reach: r.reach || 0,
      }));
  }, [numericRows, mapping, rows, headers]);

  // Scatter: spend vs reach correlation
  const scatterData = useMemo(() => {
    if (!mapping.spend || !mapping.reach) return [];
    return numericRows
      .filter(r => r.spend > 0 && r.reach > 0)
      .slice(0, 200)
      .map(r => ({ spend: r.spend, reach: r.reach, impressions: r.impressions || 0 }));
  }, [numericRows, mapping]);

  // Category distribution (donut)
  const categoryData = useMemo(() => {
    const excludes = new Set<string>([dateColumn || "", ...Object.values(mapping).filter(Boolean) as string[]]);
    const catCol = detectCategoryColumn(headers, rows, excludes);
    if (!catCol || !mapping.reach) return { col: null, data: [] as { name: string; value: number; color: string }[] };
    const acc = new Map<string, number>();
    rows.forEach(r => {
      const cat = String(r[catCol] ?? "").trim() || "—";
      acc.set(cat, (acc.get(cat) || 0) + toNumber(r[mapping.reach!]));
    });
    const data = Array.from(acc.entries())
      .map(([name, value], i) => ({ name: name.slice(0, 20), value, color: CHART_COLORS[i % CHART_COLORS.length] }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    return { col: catCol, data };
  }, [headers, rows, mapping, dateColumn]);

  // Radar comparativo (normalized 0-100)
  const radarData = useMemo(() => {
    const totals = (Object.keys(mapping) as MetricKey[])
      .filter(k => mapping[k])
      .map(k => ({
        metric: LABELS[k],
        total: numericRows.reduce((s, r) => s + (r[k] || 0), 0),
      }))
      .filter(d => d.total > 0);
    if (totals.length < 3) return [];
    const max = Math.max(...totals.map(t => t.total));
    return totals.map(t => ({ metric: t.metric, value: max > 0 ? Math.round((t.total / max) * 100) : 0 }));
  }, [numericRows, mapping]);

  const showTime = timeSeries.length >= 2;
  const showTop = topBySpend.length >= 2;
  const showScatter = scatterData.length >= 3;
  const showCategory = categoryData.data.length >= 2;
  const showRadar = radarData.length >= 3;

  if (!showTime && !showTop && !showScatter && !showCategory && !showRadar) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" /> Análise visual do CSV
      </h3>

      {showTime && (
        <Card className="glass-card border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <LineChartIcon className="h-3.5 w-3.5" /> Evolução temporal ({timeSeries.length} dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
                  <defs>
                    <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(280, 80%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  {mapping.reach && <Area type="monotone" dataKey="reach" name="Alcance" stroke="hsl(var(--primary))" fill="url(#reachGrad)" strokeWidth={2} />}
                  {mapping.impressions && <Area type="monotone" dataKey="impressions" name="Impressões" stroke="hsl(280, 80%, 60%)" fill="url(#impGrad)" strokeWidth={2} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {showTop && (
          <Card className="glass-card border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5" /> Top 10 por investimento
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topBySpend} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={120} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                    <Bar dataKey="spend" name="Investimento" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {showScatter && (
          <Card className="glass-card border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-3.5 w-3.5" /> Investimento × Alcance
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 8, right: 16, left: -10, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis type="number" dataKey="spend" name="Investimento" tick={{ fontSize: 9 }} unit=" R$" />
                    <YAxis type="number" dataKey="reach" name="Alcance" tick={{ fontSize: 9 }} />
                    <ZAxis type="number" dataKey="impressions" range={[40, 200]} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(v: number, n: string) => [
                        n === "Investimento" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : v.toLocaleString("pt-BR"),
                        n,
                      ]}
                    />
                    <Scatter data={scatterData} fill="hsl(var(--primary))" fillOpacity={0.6} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {showCategory && (
          <Card className="glass-card border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <PieChartIcon className="h-3.5 w-3.5" /> Distribuição por “{categoryData.col}”
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} strokeWidth={0}>
                      {categoryData.data.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toLocaleString("pt-BR")} />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {showRadar && (
          <Card className="glass-card border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Comparativo de métricas (normalizado)</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" opacity={0.4} />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                    <Radar name="Métricas" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                    <Tooltip contentStyle={tooltipStyle} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
