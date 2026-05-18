import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BriefTemplateRow, BriefAssignmentRow, BriefResponseRow, BriefQuestion } from "@/hooks/useBriefTemplates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: BriefTemplateRow | null;
  assignment: BriefAssignmentRow | null;
  response: BriefResponseRow | null;
  readOnly?: boolean;
  templateLoading?: boolean;
  onSave: (answers: Record<string, any>, submit: boolean) => Promise<void>;
}

const OTHER_KEY = "__other__";

export default function FillBriefDialog({ open, onOpenChange, template, assignment, response, readOnly, templateLoading, onSave }: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setAnswers(response?.answers || {});
  }, [open, response]);

  if (!assignment) return null;

  const update = (qid: string, val: any) => setAnswers(prev => ({ ...prev, [qid]: val }));

  const handleSubmit = async (submit: boolean) => {
    setSaving(true);
    await onSave(answers, submit);
    setSaving(false);
    if (submit) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card backdrop-blur-2xl border-border">
        <DialogHeader>
          <DialogTitle>{assignment.title}</DialogTitle>
          {template?.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
        </DialogHeader>

        {!template ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">
              {templateLoading ? "Carregando formulário..." : "Não foi possível carregar este formulário. Recarregue a página."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {template.questions.map((q) => (
              <QuestionField
                key={q.id}
                question={q}
                value={answers[q.id]}
                onChange={(v) => update(q.id, v)}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Fechar" : "Cancelar"}
          </Button>
          {!readOnly && (
            <>
              <Button variant="secondary" onClick={() => handleSubmit(false)} disabled={saving}>
                Salvar rascunho
              </Button>
              <Button onClick={() => handleSubmit(true)} disabled={saving}>
                {saving ? "Enviando..." : "Enviar respostas"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QuestionField({
  question: q, value: val, onChange, readOnly,
}: {
  question: BriefQuestion;
  value: any;
  onChange: (v: any) => void;
  readOnly?: boolean;
}) {
  if (q.type === "section") {
    return (
      <div className="border-t border-border pt-3 mt-2">
        <h3 className="font-semibold text-base">{q.label}</h3>
        {q.helpText && <p className="text-xs text-muted-foreground mt-0.5">{q.helpText}</p>}
      </div>
    );
  }

  const labelEl = (
    <>
      <Label className="text-sm">
        {q.label}
        {q.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {q.helpText && <p className="text-xs text-muted-foreground">{q.helpText}</p>}
    </>
  );

  return (
    <div className="space-y-1.5">
      {labelEl}

      {q.type === "short_text" && (
        <Input value={val || ""} onChange={e => onChange(e.target.value)} placeholder={q.placeholder} disabled={readOnly} />
      )}
      {q.type === "long_text" && (
        <Textarea value={val || ""} onChange={e => onChange(e.target.value)} rows={3} placeholder={q.placeholder} disabled={readOnly} />
      )}
      {q.type === "link" && (
        <Input type="url" value={val || ""} onChange={e => onChange(e.target.value)} placeholder={q.placeholder || "https://..."} disabled={readOnly} />
      )}
      {q.type === "email" && (
        <Input type="email" value={val || ""} onChange={e => onChange(e.target.value)} placeholder={q.placeholder || "voce@email.com"} disabled={readOnly} />
      )}
      {q.type === "number" && (
        <Input type="number" min={q.min} max={q.max} value={val ?? ""} onChange={e => onChange(e.target.value === "" ? "" : Number(e.target.value))} placeholder={q.placeholder} disabled={readOnly} />
      )}
      {q.type === "date" && (
        <Input type="date" value={val || ""} onChange={e => onChange(e.target.value)} disabled={readOnly} />
      )}
      {q.type === "time" && (
        <Input type="time" value={val || ""} onChange={e => onChange(e.target.value)} disabled={readOnly} />
      )}

      {q.type === "yes_no" && (
        <div className="flex items-center gap-2">
          <Switch checked={val === true} onCheckedChange={(v) => onChange(v)} disabled={readOnly} />
          <span className="text-sm">{val === true ? "Sim" : "Não"}</span>
        </div>
      )}

      {q.type === "dropdown" && (
        <Select value={val || ""} onValueChange={onChange} disabled={readOnly}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {(q.options || []).filter(Boolean).map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
            {q.allowOther && <SelectItem value={OTHER_KEY}>Outro...</SelectItem>}
          </SelectContent>
        </Select>
      )}

      {q.type === "multiple_choice" && q.options && (
        <RadioGroup value={val || ""} onValueChange={onChange} disabled={readOnly}>
          {q.options.filter(Boolean).map(opt => (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
              <Label htmlFor={`${q.id}-${opt}`} className="text-sm font-normal">{opt}</Label>
            </div>
          ))}
          {q.allowOther && (
            <div className="flex items-center gap-2">
              <RadioGroupItem value={OTHER_KEY} id={`${q.id}-other`} />
              <Label htmlFor={`${q.id}-other`} className="text-sm font-normal">Outro</Label>
            </div>
          )}
        </RadioGroup>
      )}

      {q.type === "checkbox" && q.options && (
        <div className="space-y-1.5">
          {q.options.filter(Boolean).map(opt => {
            const arr: string[] = Array.isArray(val) ? val : [];
            const checked = arr.includes(opt);
            return (
              <div key={opt} className="flex items-center gap-2">
                <Checkbox
                  checked={checked}
                  disabled={readOnly}
                  onCheckedChange={(c) => onChange(c ? [...arr, opt] : arr.filter(o => o !== opt))}
                />
                <Label className="text-sm font-normal">{opt}</Label>
              </div>
            );
          })}
          {q.allowOther && (() => {
            const arr: string[] = Array.isArray(val) ? val : [];
            const checked = arr.includes(OTHER_KEY);
            return (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={checked}
                  disabled={readOnly}
                  onCheckedChange={(c) => onChange(c ? [...arr, OTHER_KEY] : arr.filter(o => o !== OTHER_KEY))}
                />
                <Label className="text-sm font-normal">Outro</Label>
              </div>
            );
          })()}
        </div>
      )}

      {q.type === "scale" && (() => {
        const min = q.min ?? 1;
        const max = q.max ?? 5;
        const range: number[] = [];
        for (let i = min; i <= max; i++) range.push(i);
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {q.scaleMinLabel && <span className="text-xs text-muted-foreground">{q.scaleMinLabel}</span>}
              <div className="flex items-center gap-1.5 flex-wrap">
                {range.map(n => (
                  <button
                    key={n}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onChange(n)}
                    className={`h-9 w-9 rounded-md border text-sm transition-colors ${val === n ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {q.scaleMaxLabel && <span className="text-xs text-muted-foreground">{q.scaleMaxLabel}</span>}
            </div>
          </div>
        );
      })()}

      {q.type === "grid" && q.gridRows && q.gridCols && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th></th>
                {q.gridCols.filter(Boolean).map(col => (
                  <th key={col} className="px-2 pb-2 text-xs font-medium text-muted-foreground text-center">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.gridRows.filter(Boolean).map(row => {
                const obj = (val && typeof val === "object") ? val : {};
                return (
                  <tr key={row} className="border-t border-border">
                    <td className="py-2 pr-2 text-sm">{row}</td>
                    {q.gridCols!.filter(Boolean).map(col => (
                      <td key={col} className="text-center">
                        <input
                          type="radio"
                          name={`${q.id}-${row}`}
                          checked={obj[row] === col}
                          disabled={readOnly}
                          onChange={() => onChange({ ...obj, [row]: col })}
                          className="cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {q.type === "file_upload" && (
        <Input
          value={typeof val === "string" ? val : ""}
          onChange={e => onChange(e.target.value)}
          placeholder="Cole aqui o link do arquivo (Drive, Dropbox...)"
          disabled={readOnly}
        />
      )}
    </div>
  );
}
