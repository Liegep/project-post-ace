import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Check, X, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { METRIC_LABELS, SocialReportMetrics } from "@/hooks/useSocialReports";

interface CsvUploadPanelProps {
  onMetricsParsed: (metrics: SocialReportMetrics, prevMetrics: SocialReportMetrics, detectedFields: string[]) => void;
}

const METRIC_ALIASES: Record<string, string> = {
  reach: "reach", alcance: "reach", resultados: "reach", results: "reach",
  impressions: "impressions", impressoes: "impressions", "impressões": "impressions",
  engagement: "engagement", engajamento: "engagement", "taxa de engajamento": "engagement", "engagement rate": "engagement",
  interactions: "interactions", "interações": "interactions", interacoes: "interactions",
  clicks: "clicks", cliques: "clicks", "cliques no link": "clicks", "link clicks": "clicks", "cliques em links": "clicks", "link click": "clicks",
  profile_visits: "profile_visits", "visitas ao perfil": "profile_visits", "visitas_perfil": "profile_visits", "profile visits": "profile_visits",
  followers_gained: "followers_gained", "seguidores ganhos": "followers_gained", "seguidores_ganhos": "followers_gained", "followers gained": "followers_gained", "novos seguidores": "followers_gained", "new followers": "followers_gained",
  followers_lost: "followers_lost", "seguidores perdidos": "followers_lost", "seguidores_perdidos": "followers_lost", "followers lost": "followers_lost",
  posts_published: "posts_published", "posts publicados": "posts_published", "posts_publicados": "posts_published", "posts published": "posts_published",
  reels_published: "reels_published", "reels publicados": "reels_published", "reels_publicados": "reels_published", "reels published": "reels_published",
};

function cleanNumber(raw: string): number {
  if (!raw || !raw.trim()) return 0;
  let s = raw.trim().replace(/[%$€R\s]/g, "");
  // Detect pt-BR format: 1.234,56 → 1234.56
  if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    // EN format or plain: remove commas as thousand sep
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function normalizeHeader(h: string): string | null {
  const clean = h.trim().toLowerCase().replace(/[_\s]+/g, " ").replace(/[áàã]/g, "a").replace(/[éê]/g, "e").replace(/[íì]/g, "i").replace(/[óòõ]/g, "o").replace(/[úù]/g, "u").replace(/[ç]/g, "c");
  for (const [alias, key] of Object.entries(METRIC_ALIASES)) {
    const normalizedAlias = alias.replace(/[áàã]/g, "a").replace(/[éê]/g, "e").replace(/[íì]/g, "i").replace(/[óòõ]/g, "o").replace(/[úù]/g, "u").replace(/[ç]/g, "c");
    if (clean === normalizedAlias || clean.includes(normalizedAlias)) return key;
  }
  return null;
}

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(l => l.split(separator).map(c => c.trim().replace(/^"|"$/g, "")));
  return { headers, rows };
}

export function CsvUploadPanel({ onMetricsParsed }: CsvUploadPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<{ metrics: SocialReportMetrics; prevMetrics: SocialReportMetrics; fields: string[] } | null>(null);
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

      // Try two formats:
      // 1) Row-based: first column = metric name, second = current, third = previous
      // 2) Column-based: headers are metric names, row 0 = current, row 1 = previous
      const isColumnBased = mappedHeaders.filter(h => h !== null).length >= 2;

      if (isColumnBased) {
        mappedHeaders.forEach((key, idx) => {
          if (!key) return;
          detectedFields.push(key);
          const val = rows[0]?.[idx];
          metrics[key] = val ? parseFloat(val.replace(/[^\d.-]/g, "")) || 0 : 0;
          if (rows.length > 1) {
            const prev = rows[1]?.[idx];
            prevMetrics[key] = prev ? parseFloat(prev.replace(/[^\d.-]/g, "")) || 0 : 0;
          }
        });
      } else {
        // Row-based: each row has metric_name, value, [previous_value]
        rows.forEach(row => {
          const key = normalizeHeader(row[0] || "");
          if (!key) return;
          detectedFields.push(key);
          metrics[key] = row[1] ? parseFloat(row[1].replace(/[^\d.-]/g, "")) || 0 : 0;
          if (row[2]) {
            prevMetrics[key] = parseFloat(row[2].replace(/[^\d.-]/g, "")) || 0;
          }
        });
      }

      if (detectedFields.length === 0) {
        toast({ title: "Nenhuma métrica reconhecida no CSV", description: "Verifique se os cabeçalhos correspondem às métricas disponíveis", variant: "destructive" });
        return;
      }

      setParsed({ metrics, prevMetrics, fields: detectedFields });
      toast({ title: `${detectedFields.length} métricas detectadas!` });
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
    onMetricsParsed(parsed.metrics, parsed.prevMetrics, parsed.fields);
    toast({ title: "Métricas aplicadas ao relatório!" });
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
            <p className="text-[11px] text-muted-foreground">Faça upload de um arquivo CSV com métricas</p>
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
            Formatos aceitos: colunas com nomes das métricas ou linhas com métrica, valor atual, valor anterior
          </p>
        </div>

        {parsed && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium">{fileName}</span>
              <span>— {parsed.fields.length} métricas detectadas</span>
              <Button size="icon" variant="ghost" className="h-5 w-5 ml-auto" onClick={() => { setParsed(null); setFileName(""); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {parsed.fields.map(f => (
                <Badge key={f} variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  {METRIC_LABELS[f] || f}
                  {parsed.metrics[f] !== undefined && (
                    <span className="ml-1 opacity-70">{parsed.metrics[f]?.toLocaleString("pt-BR")}</span>
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
