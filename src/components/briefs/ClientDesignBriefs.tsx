import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getTemplate } from "@/lib/briefTemplates";
import { tLabel, tMeta, briefLocaleNames, type BriefLocale } from "@/lib/briefTranslations";
import { ExternalLink, Globe, FileText, Palette } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DesignBrief {
  id: string;
  title: string;
  category: string;
  answers: Record<string, any>;
  locale?: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  clientId: string;
}

export default function ClientDesignBriefs({ clientId }: Props) {
  const [briefs, setBriefs] = useState<DesignBrief[]>([]);
  const [viewing, setViewing] = useState<DesignBrief | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("design_briefs")
        .select("id, title, category, answers, locale, created_at, updated_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (data) {
        setBriefs(data.map((d: any) => ({
          ...d,
          answers: (typeof d.answers === "object" && d.answers) ? d.answers as Record<string, any> : {},
        })));
      }
    })();
  }, [clientId]);

  if (briefs.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Briefs de Design</h2>
          <Badge variant="secondary" className="text-[10px]">{briefs.length}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {briefs.map(b => {
            const template = getTemplate(b.category);
            const locale = (b.locale || "pt") as BriefLocale;
            const templateName = (template && tMeta(template.id, "name", locale)) || template?.name || b.category;

            return (
              <button
                key={b.id}
                onClick={() => setViewing(b)}
                className="text-left rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all p-4"
              >
                <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-1">{b.title}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">{templateName}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(b.created_at), "dd/MM/yyyy")}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] bg-card backdrop-blur-2xl border-border">
          {viewing && (() => {
            const template = getTemplate(viewing.category);
            const questions = template?.questions || [];
            const locale = (viewing.locale || "pt") as BriefLocale;
            const templateName = (template && tMeta(template.id, "name", locale)) || template?.name || viewing.category;

            return (
              <>
                <DialogHeader>
                  <DialogTitle>{viewing.title}</DialogTitle>
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{templateName}</Badge>
                    <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {briefLocaleNames[locale] || locale}
                    </Badge>
                  </div>
                </DialogHeader>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {questions.map(q => {
                    const val = viewing.answers[q.id];
                    if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) return null;

                    const label = tLabel(template!.id, q.id, locale) || q.label;
                    let display: React.ReactNode;

                    if (q.type === "yes_no") {
                      display = val === true ? "Sim" : "Não";
                    } else if (q.type === "checkbox" && Array.isArray(val)) {
                      display = (
                        <div className="flex flex-wrap gap-1.5">
                          {val.map((v: string) => <Badge key={v} variant="outline" className="text-[11px]">{v}</Badge>)}
                        </div>
                      );
                    } else if (q.type === "file_upload" && Array.isArray(val)) {
                      display = val.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-primary text-xs hover:underline">
                          <ExternalLink className="h-3 w-3" />
                          {decodeURIComponent(url.split("/").pop() || "arquivo")}
                        </a>
                      ));
                    } else if (q.type === "link" && typeof val === "string") {
                      display = (
                        <a href={val} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> {val}
                        </a>
                      );
                    } else {
                      display = <p className="text-sm text-foreground whitespace-pre-wrap">{String(val)}</p>;
                    }

                    return (
                      <div key={q.id} className="rounded-xl bg-muted/50 border border-border p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">{label}</p>
                        {display}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
