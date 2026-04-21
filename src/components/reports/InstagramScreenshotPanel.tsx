import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { SocialReportMetrics, METRIC_LABELS, INSTAGRAM_METRIC_FIELDS } from "@/hooks/useSocialReports";

interface Props {
  onParsed: (metrics: SocialReportMetrics, prevMetrics: SocialReportMetrics) => void;
}

export function InstagramScreenshotPanel({ onParsed }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<SocialReportMetrics | null>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file));
    setExtracted(null);
    setLoading(true);
    try {
      const image_base64 = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("parse-instagram-screenshot", {
        body: { image_base64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const metrics = (data?.metrics || {}) as SocialReportMetrics;
      const prev = (data?.previous_metrics || {}) as SocialReportMetrics;
      if (Object.keys(metrics).length === 0) {
        toast({
          title: "Nenhuma métrica detectada",
          description: "Tente um print mais nítido do painel de Insights.",
          variant: "destructive",
        });
        return;
      }
      setExtracted(metrics);
      onParsed(metrics, prev);
      toast({
        title: "Métricas extraídas!",
        description: `${Object.keys(metrics).length} cards reconhecidos automaticamente.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao processar imagem",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setExtracted(null);
  };

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Importar print do Instagram (IA)
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Envie uma captura do painel de Insights do Instagram. A IA reconhece os cards
          (Visualizações, Alcance, Interações, Visitas, Cliques, Seguidores) e preenche o relatório.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!preview ? (
          <label className="block">
            <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border/60 hover:border-primary/40 rounded-lg p-8 cursor-pointer transition-colors bg-background/30">
              <ImagePlus className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm font-medium">Selecione uma imagem</p>
              <p className="text-[11px] text-muted-foreground">PNG, JPG — print da tela de Insights</p>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border border-border/40 bg-background/40">
              <img src={preview} alt="Print do Instagram" className="w-full max-h-[320px] object-contain" />
              <Button
                size="icon"
                variant="ghost"
                onClick={reset}
                className="absolute top-2 right-2 h-7 w-7 bg-background/80 hover:bg-background"
                aria-label="Remover"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2 text-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span>Lendo métricas com IA...</span>
                  </div>
                </div>
              )}
            </div>

            {extracted && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INSTAGRAM_METRIC_FIELDS.map((field) => {
                  const v = extracted[field];
                  if (v === undefined) return null;
                  return (
                    <div
                      key={field}
                      className="rounded-md bg-background/40 border border-border/40 px-2.5 py-2"
                    >
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {METRIC_LABELS[field] || field}
                      </p>
                      <p className="text-sm font-semibold tabular-nums">
                        {Number(v).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
