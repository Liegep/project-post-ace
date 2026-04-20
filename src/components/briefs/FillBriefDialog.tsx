import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import type { BriefTemplateRow, BriefAssignmentRow, BriefResponseRow } from "@/hooks/useBriefTemplates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: BriefTemplateRow | null;
  assignment: BriefAssignmentRow | null;
  response: BriefResponseRow | null;
  readOnly?: boolean;
  onSave: (answers: Record<string, any>, submit: boolean) => Promise<void>;
}

export default function FillBriefDialog({ open, onOpenChange, template, assignment, response, readOnly, onSave }: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setAnswers(response?.answers || {});
  }, [open, response]);

  if (!template || !assignment) return null;

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
          {template.description && <p className="text-sm text-muted-foreground">{template.description}</p>}
        </DialogHeader>

        <div className="space-y-4">
          {template.questions.map((q) => {
            const val = answers[q.id];
            return (
              <div key={q.id} className="space-y-1.5">
                <Label className="text-sm">
                  {q.label}
                  {q.required && <span className="text-destructive ml-1">*</span>}
                </Label>

                {q.type === "short_text" && (
                  <Input value={val || ""} onChange={e => update(q.id, e.target.value)} disabled={readOnly} />
                )}
                {q.type === "long_text" && (
                  <Textarea value={val || ""} onChange={e => update(q.id, e.target.value)} rows={3} disabled={readOnly} />
                )}
                {q.type === "link" && (
                  <Input type="url" value={val || ""} onChange={e => update(q.id, e.target.value)} placeholder="https://..." disabled={readOnly} />
                )}
                {q.type === "yes_no" && (
                  <div className="flex items-center gap-2">
                    <Switch checked={val === true} onCheckedChange={(v) => update(q.id, v)} disabled={readOnly} />
                    <span className="text-sm">{val === true ? "Sim" : "Não"}</span>
                  </div>
                )}
                {q.type === "multiple_choice" && q.options && (
                  <RadioGroup value={val || ""} onValueChange={(v) => update(q.id, v)} disabled={readOnly}>
                    {q.options.map(opt => (
                      <div key={opt} className="flex items-center gap-2">
                        <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                        <Label htmlFor={`${q.id}-${opt}`} className="text-sm font-normal">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                {q.type === "checkbox" && q.options && (
                  <div className="space-y-1.5">
                    {q.options.map(opt => {
                      const arr: string[] = Array.isArray(val) ? val : [];
                      const checked = arr.includes(opt);
                      return (
                        <div key={opt} className="flex items-center gap-2">
                          <Checkbox
                            checked={checked}
                            disabled={readOnly}
                            onCheckedChange={(c) => {
                              const next = c ? [...arr, opt] : arr.filter(o => o !== opt);
                              update(q.id, next);
                            }}
                          />
                          <Label className="text-sm font-normal">{opt}</Label>
                        </div>
                      );
                    })}
                  </div>
                )}
                {q.type === "file_upload" && (
                  <Input
                    value={typeof val === "string" ? val : ""}
                    onChange={e => update(q.id, e.target.value)}
                    placeholder="Cole aqui o link do arquivo (Drive, Dropbox...)"
                    disabled={readOnly}
                  />
                )}
              </div>
            );
          })}
        </div>

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
