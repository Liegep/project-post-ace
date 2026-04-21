import { useState, useRef, useMemo } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Check, X, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { SocialReportMetrics } from "@/hooks/useSocialReports";

export interface CsvParsedExtra {
  periodStart?: string;
  periodEnd?: string;
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

type MetricKey =
  | "reach"
  | "impressions"
  | "spend"
  | "interactions"
  | "clicks"
  | "profile_visits"
  | "followers_gained";

const KEYWORDS: Record<MetricKey, string[]> = {
  reach: ["alcance", "reach", "pessoas alcancadas"],
  impressions: ["impressoes do anuncio", "impressoes", "impressions", "impressao"],
  spend: ["valor gasto", "valor", "gasto", "spend", "amount spent", "investimento", "custo"],
  interactions: ["engajamento com a publicacao", "engajamento", "interacoes", "interactions", "engagement", "post engagement"],
  clicks: ["cliques no link", "cliques", "clicks", "link clicks"],
  profile_visits: ["visitas ao perfil", "profile visits", "visitas perfil"],
  followers_gained: ["seguidores ganhos", "novos seguidores", "seguidores", "followers", "followers gained", "new followers"],
};

const LABELS: Record<MetricKey, string> = {
  reach: "Alcance",
  impressions: "Impressões",
  spend: "Investimento",
  interactions: "Interações",
  clicks: "Cliques",
  profile_visits: "Visitas ao Perfil",
  followers_gained: "Seguidores Ganhos",
};

const METRIC_KEYS: MetricKey[] = [
  "reach", "impressions", "spend", "interactions", "clicks", "profile_visits", "followers_gained",
];

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Convert a CSV cell to a number, handling pt-BR (1.250,50) and en-US (1,250.50) and currency symbols. */
function toNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).replace(/[R$€$£\s]/gi, "").trim();
  if (!s) return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Try to detect which CSV column matches a given metric. Header match first, then row-cell fallback. */
function detectColumn(headers: string[], rows: Record<string, unknown>[], metric: MetricKey): string | null {
  const keywords = KEYWORDS[metric];

  // 1) Header match — prefer the most specific (longest) keyword that hits
  let best: { header: string; score: number } | null = null;
  for (const h of headers) {
    const norm = stripDiacritics(h);
    for (const k of keywords) {
      if (norm.includes(k)) {
        const score = k.length;
        if (!best || score > best.score) best = { header: h, score };
      }
    }
  }
  if (best) return best.header;

  // 2) Row-cell fallback (for exports that put metric labels in cells)
  for (const row of rows) {
    for (const h of headers) {
      const cell = stripDiacritics(String(row[h] ?? ""));
      if (cell && keywords.some(k => cell === k || cell.startsWith(k + " "))) {
        const idx = headers.indexOf(h);
        for (let j = idx + 1; j < headers.length; j++) {
          const v = toNumber(row[headers[j]]);
          if (v !== null) return headers[j];
        }
      }
    }
  }
  return null;
}

function sumColumn(rows: Record<string, unknown>[], column: string): number {
  let sum = 0;
  for (const row of rows) {
    const n = toNumber(row[column]);
    if (n !== null) sum += n;
  }
  return Math.round(sum * 100) / 100;
}

export function CsvUploadPanel({ onMetricsParsed }: CsvUploadPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const emptyMapping = (): Record<MetricKey, string> =>
    METRIC_KEYS.reduce((acc, k) => ({ ...acc, [k]: "" }), {} as Record<MetricKey, string>);
  const [mapping, setMapping] = useState<Record<MetricKey, string>>(emptyMapping());

  const totals = useMemo(() => {
    const out = METRIC_KEYS.reduce((acc, k) => ({ ...acc, [k]: 0 }), {} as Record<MetricKey, number>);
    METRIC_KEYS.forEach(k => {
      if (mapping[k]) out[k] = sumColumn(rows, mapping[k]);
    });
    return out;
  }, [rows, mapping]);

  const reset = () => {
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping(emptyMapping());
    if (fileRef.current) fileRef.current.value = "";
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({ title: "Apenas arquivos .csv são aceitos", variant: "destructive" });
      return;
    }
    setFileName(file.name);

    // First pass: parse without headers to find the real header row.
    // Facebook/Meta exports often include metadata rows (e.g. "Relatório", date ranges) before the actual header.
    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: "greedy",
      complete: (raw) => {
        const allRows = (raw.data || []).filter(r => Array.isArray(r) && r.some(c => String(c ?? "").trim() !== ""));
        if (allRows.length === 0) {
          toast({ title: "CSV vazio ou ilegível", variant: "destructive" });
          return;
        }

        // Find the header row: the row with the most non-empty string cells that look like labels
        // (contain letters, not just numbers). Scan first 10 rows.
        let headerRowIdx = 0;
        let bestScore = -1;
        const scanLimit = Math.min(10, allRows.length);
        for (let i = 0; i < scanLimit; i++) {
          const row = allRows[i];
          let score = 0;
          for (const cell of row) {
            const s = String(cell ?? "").trim();
            if (!s) continue;
            // Reward cells that contain letters (likely a label) and aren't pure numbers
            if (/[a-zA-ZÀ-ÿ]/.test(s) && !/^[\d.,\s$R€£%-]+$/.test(s)) score += 1;
          }
          if (score > bestScore) { bestScore = score; headerRowIdx = i; }
        }

        const rawHeaders = (allRows[headerRowIdx] || []).map(h => String(h ?? "").replace(/^\uFEFF/, "").trim());
        // Preserve ALL headers verbatim, even duplicates — disambiguate empty/dup names so dropdown shows them all
        const seen = new Map<string, number>();
        const fields = rawHeaders.map((h, i) => {
          const base = h || `Coluna ${i + 1}`;
          const count = seen.get(base) || 0;
          seen.set(base, count + 1);
          return count === 0 ? base : `${base} (${count + 1})`;
        });

        // Build row objects from rows AFTER the header row
        const dataRows = allRows.slice(headerRowIdx + 1);
        const data: Record<string, unknown>[] = dataRows.map(row => {
          const obj: Record<string, unknown> = {};
          fields.forEach((f, i) => { obj[f] = row[i] ?? ""; });
          return obj;
        }).filter(r => Object.values(r).some(v => v !== null && String(v).trim() !== ""));

        if (fields.length === 0 || data.length === 0) {
          toast({ title: "CSV vazio ou ilegível", variant: "destructive" });
          return;
        }

        setHeaders(fields);
        setRows(data);

        const auto = METRIC_KEYS.reduce((acc, k) => {
          acc[k] = detectColumn(fields, data, k) || "";
          return acc;
        }, {} as Record<MetricKey, string>);
        setMapping(auto);

        const detected = METRIC_KEYS.filter(k => auto[k]).length;
        toast({
          title: `${data.length} linhas lidas · ${fields.length} colunas`,
          description: `${detected}/${METRIC_KEYS.length} colunas detectadas — confirme o mapeamento abaixo`,
        });
      },
      error: () => toast({ title: "Erro ao ler o CSV", variant: "destructive" }),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const apply = () => {
    const fields: string[] = [];
    const metrics: SocialReportMetrics = {};
    // Always emit all metric keys — unmapped ones default to 0 for graceful empty handling.
    METRIC_KEYS.forEach(k => {
      metrics[k] = mapping[k] ? totals[k] : 0;
      if (mapping[k]) fields.push(k);
    });
    if (fields.length === 0) {
      toast({ title: "Selecione ao menos uma coluna", variant: "destructive" });
      return;
    }
    onMetricsParsed(metrics, {}, fields, {});
    toast({ title: "Métricas aplicadas ao relatório!" });
  };

  const formatTotal = (k: MetricKey): string => {
    const v = totals[k];
    if (k === "spend") return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
    return v.toLocaleString("pt-BR");
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
              Upload → confirmar colunas → exibir. Detecta {METRIC_KEYS.length} métricas automaticamente.
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

        {!fileName && (
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
          </div>
        )}

        {fileName && headers.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium">{fileName}</span>
              <span>— {rows.length} linhas</span>
              <Button size="icon" variant="ghost" className="h-5 w-5 ml-auto" onClick={reset}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Confirme o mapeamento de colunas
              </p>
              {METRIC_KEYS.map(k => (
                <div key={k} className="grid grid-cols-[130px_1fr_auto] items-center gap-3">
                  <Label className="text-xs">{LABELS[k]}</Label>
                  <Select value={mapping[k] || "__none__"} onValueChange={v => setMapping(m => ({ ...m, [k]: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="— selecionar coluna —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— ignorar (0) —</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="secondary" className="text-[10px] tabular-nums bg-primary/10 text-primary border-primary/20 min-w-[80px] justify-end">
                    {mapping[k] ? formatTotal(k) : "0"}
                  </Badge>
                </div>
              ))}
            </div>

            <Button onClick={apply} className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
              <ArrowRight className="h-4 w-4" />
              Aplicar ao relatório
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
