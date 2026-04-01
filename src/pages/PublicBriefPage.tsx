import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getTemplate } from "@/lib/briefTemplates";
import { tLabel, tMeta, briefLocaleNames, type BriefLocale } from "@/lib/briefTranslations";
import { ExternalLink, Globe, FileText, Loader2, ShieldAlert } from "lucide-react";

interface BriefData {
  id: string;
  title: string;
  category: string;
  answers: Record<string, any>;
  locale: string;
  created_at: string;
  updated_at: string;
}

export default function PublicBriefPage() {
  const { token } = useParams<{ token: string }>();
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    (async () => {
      setLoading(true);
      // Lookup token
      const { data: tokenData, error: tokenErr } = await supabase
        .from("design_brief_tokens")
        .select("brief_id, active, expires_at")
        .eq("token", token)
        .maybeSingle();

      if (tokenErr || !tokenData) {
        setError("Link inválido ou expirado.");
        setLoading(false);
        return;
      }

      if (!tokenData.active || (tokenData.expires_at && new Date(tokenData.expires_at) < new Date())) {
        setError("Este link expirou.");
        setLoading(false);
        return;
      }

      const { data: briefData, error: briefErr } = await supabase
        .from("design_briefs")
        .select("id, title, category, answers, locale, created_at, updated_at")
        .eq("id", tokenData.brief_id)
        .maybeSingle();

      if (briefErr || !briefData) {
        setError("Brief não encontrado.");
        setLoading(false);
        return;
      }

      setBrief({
        ...briefData,
        answers: (typeof briefData.answers === "object" && briefData.answers) ? briefData.answers as Record<string, any> : {},
      });
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !brief) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <ShieldAlert className="h-12 w-12 mx-auto text-destructive/50" />
          <p className="text-lg font-medium text-foreground">{error || "Erro ao carregar brief."}</p>
        </div>
      </div>
    );
  }

  const template = getTemplate(brief.category);
  const questions = template?.questions || [];
  const locale = (brief.locale || "pt") as BriefLocale;
  const templateName = (template && tMeta(template.id, "name", locale)) || template?.name || brief.category;
  const localeName = briefLocaleNames[locale] || locale;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="rounded-2xl border border-border bg-card shadow-xl p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">{brief.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-[10px]">{templateName}</Badge>
              <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {localeName}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(brief.updated_at), "dd/MM/yyyy 'às' HH:mm")}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {questions.map(q => {
              const val = brief.answers[q.id];
              if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) return null;

              const label = tLabel(template!.id, q.id, locale) || q.label;
              let display: React.ReactNode;

              if (q.type === "yes_no") {
                display = val === true
                  ? (locale === "en" ? "Yes" : locale === "es" ? "Sí" : locale === "it" ? "Sì" : locale === "sv" ? "Ja" : "Sim")
                  : (locale === "en" ? "No" : locale === "sv" ? "Nej" : "Não");
              } else if (q.type === "checkbox" && Array.isArray(val)) {
                display = (
                  <div className="flex flex-wrap gap-1.5">
                    {val.map((v: string) => (
                      <Badge key={v} variant="outline" className="text-[11px]">{v}</Badge>
                    ))}
                  </div>
                );
              } else if (q.type === "file_upload" && Array.isArray(val)) {
                display = (
                  <div className="space-y-1">
                    {val.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary text-xs hover:underline">
                        <ExternalLink className="h-3 w-3" />
                        {decodeURIComponent(url.split("/").pop() || "arquivo")}
                      </a>
                    ))}
                  </div>
                );
              } else if (q.type === "link" && typeof val === "string") {
                display = (
                  <a href={val} target="_blank" rel="noopener noreferrer"
                    className="text-primary text-sm hover:underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> {val}
                  </a>
                );
              } else {
                display = <p className="text-sm text-foreground whitespace-pre-wrap">{String(val)}</p>;
              }

              return (
                <div key={q.id} className="rounded-xl bg-muted/50 border border-border p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {label}
                  </p>
                  {display}
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-border text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-xs">Brief compartilhado via link seguro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
