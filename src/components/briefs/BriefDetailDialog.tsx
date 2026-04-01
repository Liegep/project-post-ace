import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { getTemplate } from "@/lib/briefTemplates";
import { tLabel, tMeta, briefLocaleNames, type BriefLocale } from "@/lib/briefTranslations";
import { ExternalLink, Globe, Link2, Download, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { downloadBriefPdf } from "@/lib/briefPdf";

interface DesignBrief {
  id: string;
  title: string;
  category: string;
  answers: Record<string, any>;
  status: string;
  locale?: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  brief: DesignBrief | null;
  open: boolean;
  onClose: () => void;
}

export default function BriefDetailDialog({ brief, open, onClose }: Props) {
  if (!brief) return null;

  const template = getTemplate(brief.category);
  const questions = template?.questions || [];
  const locale = (brief.locale || 'pt') as BriefLocale;
  const templateName = (template && tMeta(template.id, 'name', locale)) || template?.name || brief.category;
  const localeName = briefLocaleNames[locale] || locale;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-white/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {brief.title}
          </DialogTitle>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              {templateName}
            </Badge>
            <Badge variant="outline" className="text-[10px] flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {localeName}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(brief.updated_at), "dd/MM/yyyy 'às' HH:mm")}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {questions.map(q => {
            const val = brief.answers[q.id];
            if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) return null;

            const label = tLabel(template!.id, q.id, locale) || q.label;
            let display: React.ReactNode;

            if (q.type === "yes_no") {
              display = val === true
                ? (locale === 'sv' ? 'Ja' : locale === 'it' ? 'Sì' : locale === 'es' ? 'Sí' : locale === 'en' ? 'Yes' : 'Sim')
                : (locale === 'sv' ? 'Nej' : locale === 'en' ? 'No' : 'Não');
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
              <div key={q.id} className="rounded-xl bg-white/40 dark:bg-white/5 border border-white/15 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {label}
                </p>
                {display}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
