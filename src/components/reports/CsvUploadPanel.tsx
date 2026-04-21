import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Check, X, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { METRIC_LABELS, SocialReportMetrics } from "@/hooks/useSocialReports";

export interface CsvParsedExtra {
  periodStart?: string; // YYYY-MM-DD
  periodEnd?: string;   // YYYY-MM-DD
  campaignTitle?: string;
}

interface CsvUploadPanelProps {
  onMetricsParsed: (
    metrics: SocialReportMetrics,
    prevMetrics: SocialReportMetrics,
    detectedFields: string[],
    extra?: CsvParsedExtra,
  ) => void;
}

// Maps normalized header text -> internal metric key (or special key)
const METRIC_ALIASES: Record<string, string> = {
  // Reach
  reach: "reach", alcance: "reach", resultados: "reach", results: "reach",
  // Impressions
  impressions: "impressions", impressoes: "impressions", "impressões": "impressions",
  // Engagement
  engagement: "engagement", engajamento: "engagement", "taxa de engajamento": "engagement", "engagement rate": "engagement",
  // Interactions
  interactions: "interactions", "interações": "interactions", interacoes: "interactions",
  // Clicks
  clicks: "clicks", cliques: "clicks", "cliques no link": "clicks", "link clicks": "clicks", "cliques em links": "clicks", "link click": "clicks",
  // Profile visits
  profile_visits: "profile_visits", "visitas ao perfil": "profile_visits", "visitas_perfil": "profile_visits", "profile visits": "profile_visits",
  // Followers gained
  followers_gained: "followers_gained", "seguidores ganhos": "followers_gained", "seguidores_ganhos": "followers_gained", "followers gained": "followers_gained", "novos seguidores": "followers_gained", "new followers": "followers_gained",
  // Followers lost
  followers_lost: "followers_lost", "seguidores perdidos": "followers_lost", "seguidores_perdidos": "followers_lost", "followers lost": "followers_lost",
  // Posts / Reels published
  posts_published: "posts_published", "posts publicados": "posts_published", "posts_publicados": "posts_published", "posts published": "posts_published",
  reels_published: "reels_published", "reels publicados": "reels_published", "reels_publicados": "reels_published", "reels published": "reels_published",
  // Spend (Facebook Ads)
  spend: "spend",
  "amount spent": "spend",
  "amount spent brl": "spend",
  "amount spent (brl)": "spend",
  "amount spent usd": "spend",
  "amount spent (usd)": "spend",
  "valor gasto": "spend",
  "valor usado": "spend",
  investimento: "spend",
  "investimento (brl)": "spend",
  // Special non-metric fields
  "campaign name": "__campaign_name__",
  "nome da campanha": "__campaign_name__",
  "reporting starts": "__period_start__",
  "reporting start": "__period_start__",
  "início dos relatórios": "__period_start__",
  "inicio dos relatorios": "__period_start__",
  "reporting ends": "__period_end__",
  "reporting end": "__period_end__",
  "término dos relatórios": "__period_end__",
  "termino dos relatorios": "__period_end__",
};

function stripDiacritics(s: string): string {
  return s
    .replace(/[áàãâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[íìîï]/g, "i")
    .replace(/[óòõôö]/g, "o").replace(/[úùûü]/g, "u").replace(/[ç]/g, "c");
}

function normalizeHeaderRaw(h: string): string {
  return stripDiacritics(h.trim().toLowerCase()).replace(/[_\s]+/g, " ").trim();
}

function normalizeHeader(h: string): string | null {
  const clean = normalizeHeaderRaw(h);
  if (METRIC_ALIASES[clean]) return METRIC_ALIASES[clean];
  // Strip parenthesised currency suffix like "(brl)" then retry
  const noParen = clean.replace(/\s*\([^)]*\)\s*/g, "").trim();
  if (METRIC_ALIASES[noParen]) return METRIC_ALIASES[noParen];
  // Fuzzy contains as last resort
  for (const [alias, key] of Object.entries(METRIC_ALIASES)) {
    const a = stripDiacritics(alias);
    if (clean === a || clean.includes(a)) return key;
  }
  return null;
}

/** Clean an integer-like CSV cell: strips R$, currency, spaces, dots and commas (thousands). */
function cleanInt(raw: string): number {
  if (!raw) return 0;
  const s = raw.replace(/[R$€$£\s.,]/g, "");
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

/** Clean a money/decimal cell using pt-BR rules: removes 'R$' and spaces, then '1.250,50' → 1250.50. */
function cleanMoney(raw: string): number {
  if (!raw) return 0;
  let s = raw.replace(/[R$€$£\s]/gi, "").trim();
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // pt-BR: dot = thousands, comma = decimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // Only comma → decimal separator pt-BR
    s = s.replace(",", ".");
  }
  // Else only dots or plain digits → leave as-is (en-US)
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Normalize a date cell to YYYY-MM-DD if possible. Accepts YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY. */
function normalizeDate(raw: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY (default Brazilian) or MM/DD/YYYY (Facebook English exports)
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const y = m[3];
    // If first part > 12, must be DD/MM; else assume MM/DD (Facebook default in English exports)
    let day: number, month: number;
    if (a > 12) { day = a; month = b; }
    else { month = a; day = b; }
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  // Fallback: try Date parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return undefined;
}

/** Robust CSV line splitter that respects quoted commas. */
function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === sep && !inQuote) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(c => c.trim());
}

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  // Detect separator from first line: prefer comma, but use ; if it appears more often
  const first = lines[0];
  const sep = (first.split(";").length - 1) > (first.split(",").length - 1) ? ";" : ",";
  const headers = splitCsvLine(first, sep).map(h => h.replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(l => splitCsvLine(l, sep).map(c => c.replace(/^"|"$/g, "")));
  return { headers, rows };
}

const INTEGER_KEYS = new Set([
  "reach", "impressions", "interactions", "clicks", "profile_visits",
  "followers_gained", "followers_lost", "posts_published", "reels_published",
]);

export function CsvUploadPanel({ onMetricsParsed }: CsvUploadPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<{
    metrics: SocialReportMetrics;
    prevMetrics: SocialReportMetrics;
    fields: string[];
    extra: CsvParsedExtra;
  } | null>(null);
  const [fileName, setFileName] = useState("");

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Apenas arquivos .csv são aceitos", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCsvText(text);

      if (rows.length === 0) {
        toast({ title: "CSV vazio ou formato inválido", variant: "destructive" });
        return;
      }

      const mappedHeaders = headers.map(h => normalizeHeader(h));
      const metrics: SocialReportMetrics = {};
      const prevMetrics: SocialReportMetrics = {};
      const detectedFields: string[] = [];
      const extra: CsvParsedExtra = {};

      // Determine layout: column-based (typical Facebook export = headers row + many data rows
      // we aggregate by SUM across rows) vs row-based (metric name | current | previous).
      const recognizedColumns = mappedHeaders.filter(h => h !== null).length;
      const isColumnBased = recognizedColumns >= 2;

      if (isColumnBased) {
        const titles: string[] = [];
        const startDates: string[] = [];
        const endDates: string[] = [];

        for (const row of rows) {
          mappedHeaders.forEach((key, idx) => {
            if (!key) return;
            const cell = row[idx] ?? "";
            if (key === "__campaign_name__") {
              if (cell.trim()) titles.push(cell.trim());
              return;
            }
            if (key === "__period_start__") {
              const d = normalizeDate(cell);
              if (d) startDates.push(d);
              return;
            }
            if (key === "__period_end__") {
              const d = normalizeDate(cell);
              if (d) endDates.push(d);
              return;
            }
            // Numeric metric — accumulate sum across rows
            const value = key === "spend" ? cleanMoney(cell) : cleanInt(cell);
            metrics[key] = (metrics[key] ?? 0) + value;
            if (!detectedFields.includes(key)) detectedFields.push(key);
          });
        }

        // Period: take min(start) / max(end)
        if (startDates.length) extra.periodStart = startDates.sort()[0];
        if (endDates.length) extra.periodEnd = endDates.sort()[endDates.length - 1];
        // Campaign title: first non-empty (or first if multiple campaigns in file)
        if (titles.length === 1) extra.campaignTitle = titles[0];
        else if (titles.length > 1) extra.campaignTitle = `${titles[0]} (+${titles.length - 1})`;

        // Round integer metrics to whole numbers
        for (const k of detectedFields) {
          if (INTEGER_KEYS.has(k) && metrics[k] !== undefined) {
            metrics[k] = Math.round(metrics[k] as number);
          }
        }
      } else {
        // Row-based: metric | current | previous
        rows.forEach(row => {
          const key = normalizeHeader(row[0] || "");
          if (!key || key.startsWith("__")) return;
          if (!detectedFields.includes(key)) detectedFields.push(key);
          metrics[key] = key === "spend" ? cleanMoney(row[1] || "") : cleanInt(row[1] || "");
          if (row[2]) {
            prevMetrics[key] = key === "spend" ? cleanMoney(row[2]) : cleanInt(row[2]);
          }
        });
      }

      if (detectedFields.length === 0) {
        toast({
          title: "Nenhuma métrica reconhecida no CSV",
          description: "Verifique se os cabeçalhos correspondem às métricas disponíveis (Reach, Impressions, Amount Spent…)",
          variant: "destructive",
        });
        return;
      }

      setParsed({ metrics, prevMetrics, fields: detectedFields, extra });
      const extraBits: string[] = [];
      if (extra.periodStart && extra.periodEnd) extraBits.push("período detectado");
      if (extra.campaignTitle) extraBits.push("campanha detectada");
      toast({
        title: `${detectedFields.length} métricas detectadas!`,
        description: extraBits.length ? extraBits.join(" • ") : undefined,
      });
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const applyMetrics = () => {
    if (!parsed) return;
    onMetricsParsed(parsed.metrics, parsed.prevMetrics, parsed.fields, parsed.extra);
    toast({ title: "Métricas aplicadas ao relatório!" });
  };

  const formatValue = (key: string, value?: number) => {
    if (value === undefined) return "";
    if (key === "spend") {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
    }
    return value.toLocaleString("pt-BR");
  };

  return (
    <Card className="overflow-hidden border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/[0.03] to-accent/[0.03] backdrop-blur-sm">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Importar CSV</h3>
            <p className="text-[11px] text-muted-foreground">
              Suporta exports do Facebook Ads (Reach, Impressions, Amount Spent…) e relatórios manuais
            </p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
        />

        <div
          className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer p-6 text-center ${
            dragOver
              ? "border-primary bg-primary/10 scale-[1.01]"
              : "border-border/50 hover:border-primary/40 hover:bg-primary/[0.02]"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground">
            Arraste um arquivo CSV ou <span className="text-primary font-medium underline">clique para selecionar</span>
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            Várias linhas (ex.: campanhas) são somadas automaticamente. Datas e moeda BRL são reconhecidas.
          </p>
        </div>

        {parsed && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium">{fileName}</span>
              <span>— {parsed.fields.length} métricas</span>
              {parsed.extra.periodStart && parsed.extra.periodEnd && (
                <span className="hidden sm:inline">• {parsed.extra.periodStart} → {parsed.extra.periodEnd}</span>
              )}
              <Button size="icon" variant="ghost" className="h-5 w-5 ml-auto" onClick={() => { setParsed(null); setFileName(""); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {parsed.fields.map(f => (
                <Badge key={f} variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  {METRIC_LABELS[f] || f}
                  {parsed.metrics[f] !== undefined && (
                    <span className="ml-1 opacity-70">{formatValue(f, parsed.metrics[f])}</span>
                  )}
                </Badge>
              ))}
            </div>

            <Button onClick={applyMetrics} className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <ArrowRight className="h-4 w-4" />
              Aplicar métricas ao relatório
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
