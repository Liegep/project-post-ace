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

type MetricKey = "reach" | "impressions" | "spend";

const KEYWORDS: Record<MetricKey, string[]> = {
  reach: ["alcance", "reach", "pessoas alcancadas"],
  impressions: ["impressoes", "impressions", "impressao"],
  spend: ["valor", "gasto", "spend", "amount spent", "investimento", "custo"],
};

const LABELS: Record<MetricKey, string> = {
  reach: "Alcance",
  impressions: "Impressões",
  spend: "Investimento",
};

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
    // The rightmost separator is the decimal one
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // pt-BR decimal
    s = s.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

/** Try to detect which CSV column matches a given metric, scanning ALL rows for keyword matches. */
function detectColumn(headers: string[], rows: Record<string, unknown>[], metric: MetricKey): string | null {
  const keywords = KEYWORDS[metric];

  // 1) Match by header name
  for (const h of headers) {
    const norm = stripDiacritics(h);
    if (keywords.some(k => norm.includes(k))) return h;
  }

  // 2) Scan rows for any cell that contains the keyword (some Facebook exports place metric names in cells)
  for (const row of rows) {
    for (const h of headers) {
      const cell = stripDiacritics(String(row[h] ?? ""));
      if (cell && keywords.some(k => cell === k || cell.startsWith(k + " "))) {
        // Found the metric label in a cell — its NUMERIC neighbour column is likely the value.
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

/** Sum every numeric value in a column, ignoring rows where the cell isn't a number. */
function sumColumn(rows: Record<string, unknown>[], column: string): number {
  let sum = 0;
  for (const row of rows) {
    const n = toNumber(row[column]);
    if (n !== null) sum += n;
  }
  return Math.round(sum * 100) / 100; // 2 decimal max
}

export function CsvUploadPanel({ onMetricsParsed }: CsvUploadPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<MetricKey, string>>({ reach: "", impressions: "", spend: "" });

  const totals = useMemo(() => {
    const out: Record<MetricKey, number> = { reach: 0, impressions: 0, spend: 0 };
    (Object.keys(mapping) as MetricKey[]).forEach(k => {
      if (mapping[k]) out[k] = sumColumn(rows, mapping[k]);
    });
    return out;
  }, [rows, mapping]);

  const reset = () => {
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({ reach: "", impressions: "", spend: "" });
    if (fileRef.current) fileRef.current.value = "";
  };

  const processFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({ title: "Apenas arquivos .csv são aceitos", variant: "destructive" });
      return;
    }
    setFileName(file.name);

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const fields = (results.meta.fields || []).filter(Boolean);
        const data = (results.data || []).filter(r => Object.values(r).some(v => v !== null && String(v).trim() !== ""));

        if (fields.length === 0 || data.length === 0) {
          toast({ title: "CSV vazio ou ilegível", variant: "destructive" });
          return;
        }

        setHeaders(fields);
        setRows(data);

        // Auto-detect the 3 metric columns
        const auto: Record<MetricKey, string> = {
          reach: detectColumn(fields, data, "reach") || "",
          impressions: detectColumn(fields, data, "impressions") || "",
          spend: detectColumn(fields, data, "spend") || "",
        };
        setMapping(auto);

        const detected = (Object.keys(auto) as MetricKey[]).filter(k => auto[k]).length;
        toast({
          title: `${data.length} linhas lidas`,
          description: detected === 3
            ? "Todas as colunas foram detectadas automaticamente"
            : `${detected}/3 colunas detectadas — confirme o mapeamento abaixo`,
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
    (Object.keys(mapping) as MetricKey[]).forEach(k => {
      if (mapping[k]) {
        metrics[k] = totals[k];
        fields.push(k);
      }
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
              Upload → confirmar colunas → exibir. Detecta Alcance, Impressões e Valor automaticamente.
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

            <div className="space-y-3 rounded-lg border border-border/50 bg-background/40 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Confirme o mapeamento de colunas
              </p>
              {(Object.keys(mapping) as MetricKey[]).map(k => (
                <div key={k} className="grid grid-cols-[100px_1fr_auto] items-center gap-3">
                  <Label className="text-xs">{LABELS[k]}</Label>
                  <Select value={mapping[k] || "__none__"} onValueChange={v => setMapping(m => ({ ...m, [k]: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="— selecionar coluna —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— ignorar —</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge variant="secondary" className="text-[10px] tabular-nums bg-primary/10 text-primary border-primary/20 min-w-[80px] justify-end">
                    {mapping[k] ? formatTotal(k) : "—"}
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
