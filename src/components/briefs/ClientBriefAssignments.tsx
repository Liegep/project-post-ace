import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, ArrowRight, CheckCircle2, Clock, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { useBriefTemplates, useBriefAssignments } from "@/hooks/useBriefTemplates";
import FillBriefDialog from "./FillBriefDialog";
import { toast } from "@/hooks/use-toast";
import { tUI, type BriefLocale } from "@/lib/briefTranslations";

interface Props {
  clientId: string;
  locale?: string;
}

export default function ClientBriefAssignments({ clientId, locale = "pt" }: Props) {
  const { templates, loading: tplLoading } = useBriefTemplates();
  const { assignments, responses, upsertResponse } = useBriefAssignments({ clientId });
  const [openId, setOpenId] = useState<string | null>(null);

  const briefLocale = (["pt", "en", "es", "it", "sv"].includes(locale) ? locale : "pt") as BriefLocale;

  // Hide submitted briefs from client view — they go to the admin only
  const visibleAssignments = assignments.filter(a => a.status !== "submitted");

  if (visibleAssignments.length === 0) return null;


  const current = assignments.find(a => a.id === openId) || null;
  const currentTpl = current ? templates.find(t => t.id === current.template_id) || null : null;
  const currentResp = current ? responses.find(r => r.assignment_id === current.id) || null : null;
  const isReadOnly = current?.status === "submitted";

  const handleOpen = (assignmentId: string, templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl && !tplLoading) {
      toast({
        title: "Formulário indisponível",
        description: "Não foi possível carregar este formulário. Recarregue a página ou contate o administrador.",
        variant: "destructive",
      });
      return;
    }
    setOpenId(assignmentId);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Briefs para preencher</h2>
          <Badge variant="secondary" className="text-[10px]">{visibleAssignments.length}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleAssignments.map(a => {
            const tpl = templates.find(t => t.id === a.template_id);
            const resp = responses.find(r => r.assignment_id === a.id);
            const isSubmitted = a.status === "submitted";
            const isReopened = a.status === "reopened";

            const StatusIcon = isSubmitted ? CheckCircle2 : isReopened ? RotateCcw : Clock;
            const statusLabel = isSubmitted ? "Enviado" : isReopened ? "Reaberto" : "Pendente";
            const statusColor = isSubmitted
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
              : isReopened
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
              : "bg-primary/15 text-primary border-primary/30";

            return (
              <div
                key={a.id}
                className="group relative rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300 p-4 flex flex-col gap-3 overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
                      {a.title}
                    </h3>
                    {tpl?.name && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tpl.name}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border shrink-0 ${statusColor}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusLabel}
                  </span>
                </div>

                {(a.due_date || resp?.submitted_at) && (
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {a.due_date && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Prazo: {format(new Date(a.due_date), "dd/MM/yyyy")}
                      </span>
                    )}
                    {resp?.submitted_at && (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {format(new Date(resp.submitted_at), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => handleOpen(a.id, a.template_id)}
                  disabled={tplLoading && !tpl}
                  size="sm"
                  className="w-full mt-auto group/btn gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  variant={isSubmitted ? "outline" : "default"}
                >
                  {tplLoading && !tpl
                    ? "Carregando..."
                    : isSubmitted
                    ? "Ver respostas"
                    : resp
                    ? "Continuar preenchendo"
                    : "Abrir formulário"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <FillBriefDialog
        open={!!openId}
        onOpenChange={(v) => !v && setOpenId(null)}
        template={currentTpl}
        assignment={current}
        response={currentResp}
        readOnly={isReadOnly}
        templateLoading={tplLoading}
        onSave={async (answers, submit) => {
          if (!current || !currentTpl) return;
          const ok = await upsertResponse(current.id, current.client_id, currentTpl.id, answers, submit);
          if (ok) {
            if (submit) {
              toast({
                title: tUI("submitted_success_title", briefLocale),
                description: tUI("submitted_success_desc", briefLocale),
              });
              setOpenId(null);
            } else {
              toast({ title: tUI("draft_saved", briefLocale) });
            }
          }
        }}
      />
    </>
  );
}
