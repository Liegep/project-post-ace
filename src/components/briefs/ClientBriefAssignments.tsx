import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Edit2 } from "lucide-react";
import { format } from "date-fns";
import { useBriefTemplates, useBriefAssignments, type BriefAssignmentRow } from "@/hooks/useBriefTemplates";
import FillBriefDialog from "./FillBriefDialog";
import { toast } from "@/hooks/use-toast";

interface Props {
  clientId: string;
}

export default function ClientBriefAssignments({ clientId }: Props) {
  const { templates } = useBriefTemplates();
  const { assignments, responses, upsertResponse } = useBriefAssignments({ clientId });
  const [openId, setOpenId] = useState<string | null>(null);

  if (assignments.length === 0) return null;

  const current = assignments.find(a => a.id === openId) || null;
  const currentTpl = current ? templates.find(t => t.id === current.template_id) || null : null;
  const currentResp = current ? responses.find(r => r.assignment_id === current.id) || null : null;
  const isReadOnly = current?.status === "submitted";

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Briefs para preencher</h2>
          <Badge variant="secondary" className="text-[10px]">{assignments.length}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {assignments.map(a => {
            const tpl = templates.find(t => t.id === a.template_id);
            const resp = responses.find(r => r.assignment_id === a.id);
            const statusLabel =
              a.status === "submitted" ? "Enviado" :
              a.status === "reopened" ? "Reaberto" : "Pendente";
            const statusVariant: "default" | "secondary" | "outline" =
              a.status === "submitted" ? "default" : a.status === "reopened" ? "secondary" : "outline";

            return (
              <button
                key={a.id}
                onClick={() => setOpenId(a.id)}
                className="text-left rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-all p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-2">{a.title}</h3>
                  <Badge variant={statusVariant} className="text-[10px] shrink-0">{statusLabel}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{tpl?.name}</p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                  {a.due_date && <span>Prazo: {format(new Date(a.due_date), "dd/MM/yyyy")}</span>}
                  {resp?.submitted_at && <span>Enviado: {format(new Date(resp.submitted_at), "dd/MM/yyyy")}</span>}
                </div>
              </button>
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
        onSave={async (answers, submit) => {
          if (!current || !currentTpl) return;
          const ok = await upsertResponse(current.id, current.client_id, currentTpl.id, answers, submit);
          if (ok) toast({ title: submit ? "Brief enviado!" : "Rascunho salvo" });
        }}
      />
    </>
  );
}
