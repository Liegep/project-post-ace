import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertTriangle, XCircle, Loader2,
  Sparkles, RotateCcw, Trash2, Star, FileText, ArrowRight
} from "lucide-react";

interface SimilarBrief {
  id: string;
  title: string;
  similarity_reason: string;
  status: string;
  content_type: string;
  created_at: string;
}

interface Suggestion {
  type: "angle" | "format" | "title" | "approach";
  text: string;
}

interface SimilarityResult {
  similarity_level: "new" | "similar" | "very_similar";
  similarity_percent: number;
  similar_briefs: SimilarBrief[];
  suggestions: Suggestion[];
}

interface BriefSimilarityPanelProps {
  clientId: string;
  title: string;
  description: string;
  excludeBriefId?: string;
  onApplyTitle?: (title: string) => void;
  onApplyDescription?: (description: string) => void;
  onDiscard?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  internal: "Interno",
  pending_approval: "Aguardando Aprovação",
  approved: "Aprovado",
  rejected: "Reprovado",
  published: "Publicado",
};

const SUGGESTION_ICONS: Record<string, string> = {
  angle: "🔄",
  format: "📐",
  title: "✏️",
  approach: "💡",
};

const SUGGESTION_LABELS: Record<string, string> = {
  angle: "Novo ângulo",
  format: "Formato diferente",
  title: "Variação de título",
  approach: "Abordagem alternativa",
};

export function BriefSimilarityPanel({
  clientId,
  title,
  description,
  excludeBriefId,
  onApplyTitle,
  onApplyDescription,
  onDiscard,
}: BriefSimilarityPanelProps) {
  const [result, setResult] = useState<SimilarityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const checkSimilarity = useCallback(async () => {
    if (!clientId || !title.trim()) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("check-brief-similarity", {
        body: {
          client_id: clientId,
          title: title.trim(),
          description: description.trim(),
          exclude_brief_id: excludeBriefId,
        },
      });

      if (fnError) throw fnError;
      setResult(data as SimilarityResult);
    } catch (e: any) {
      console.error("Similarity check error:", e);
      setError("Não foi possível verificar similaridade");
    } finally {
      setLoading(false);
    }
  }, [clientId, title, description, excludeBriefId]);

  // Debounced trigger
  const triggerCheck = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      checkSimilarity();
    }, 1500);
  }, [checkSimilarity]);

  // Expose trigger for parent
  // Use useEffect-like pattern: call triggerCheck when inputs change
  // But we'll use an explicit button + auto-check approach

  if (!clientId || !title.trim()) return null;

  const levelConfig = {
    new: {
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      label: "Pauta nova",
      emoji: "🟢",
    },
    similar: {
      icon: AlertTriangle,
      color: "text-amber-600",
      bg: "bg-amber-500/10 border-amber-500/20",
      label: "Pauta parecida com conteúdos anteriores",
      emoji: "🟡",
    },
    very_similar: {
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-500/10 border-red-500/20",
      label: "Pauta muito semelhante a outra já criada",
      emoji: "🔴",
    },
  };

  return (
    <div className="space-y-3">
      {/* Check button */}
      {!result && !loading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={checkSimilarity}
          className="gap-1.5 text-xs w-full"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Verificar similaridade com pautas anteriores
        </Button>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Analisando similaridade...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={checkSimilarity}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className={cn("rounded-lg border p-3 space-y-3", levelConfig[result.similarity_level].bg)}>
          {/* Header badge */}
          <div className="flex items-center gap-2">
            <span className="text-lg">{levelConfig[result.similarity_level].emoji}</span>
            <div className="flex-1">
              <p className={cn("text-sm font-semibold", levelConfig[result.similarity_level].color)}>
                {levelConfig[result.similarity_level].label}
              </p>
              <p className="text-xs text-muted-foreground">
                Similaridade: {result.similarity_percent}%
              </p>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                result.similarity_level === "new" && "bg-emerald-500/20 text-emerald-700",
                result.similarity_level === "similar" && "bg-amber-500/20 text-amber-700",
                result.similarity_level === "very_similar" && "bg-red-500/20 text-red-700"
              )}
            >
              {result.similarity_percent}%
            </Badge>
          </div>

          {/* Similar briefs list */}
          {result.similar_briefs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Pautas semelhantes:</p>
              {result.similar_briefs.map((sb) => (
                <div key={sb.id} className="rounded-md bg-card/80 border p-2 text-xs">
                  <div className="flex items-start gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{sb.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                        {sb.status && (
                          <span className="text-[10px]">{STATUS_LABELS[sb.status] || sb.status}</span>
                        )}
                        {sb.created_at && (
                          <span className="text-[10px]">
                            {new Date(sb.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-1 italic">{sb.similarity_reason}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Sugestões da IA:
              </p>
              {result.suggestions.map((s, i) => (
                <div
                  key={i}
                  className="rounded-md bg-card/80 border p-2 text-xs flex items-start gap-2"
                >
                  <span className="shrink-0">{SUGGESTION_ICONS[s.type] || "💡"}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-muted-foreground">
                      {SUGGESTION_LABELS[s.type] || s.type}:
                    </span>{" "}
                    <span className="text-foreground">{s.text}</span>
                  </div>
                  {s.type === "title" && onApplyTitle && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] shrink-0"
                      onClick={() => onApplyTitle(s.text)}
                    >
                      Usar
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-xs h-7 bg-card/80"
              onClick={() => setResult(null)}
            >
              <CheckCircle2 className="h-3 w-3" /> Usar mesmo assim
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-xs h-7 bg-card/80"
              onClick={checkSimilarity}
            >
              <RotateCcw className="h-3 w-3" /> Gerar variação
            </Button>
            {onDiscard && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 text-xs h-7 text-destructive hover:text-destructive bg-card/80"
                onClick={onDiscard}
              >
                <Trash2 className="h-3 w-3" /> Descartar pauta
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Re-check button when result is shown */}
      {result && !loading && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={checkSimilarity}
          className="gap-1.5 text-xs w-full text-muted-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Verificar novamente
        </Button>
      )}
    </div>
  );
}
