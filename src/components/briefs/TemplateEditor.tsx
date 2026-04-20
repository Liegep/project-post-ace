import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import type { BriefTemplateRow, BriefQuestion, FieldType } from "@/hooks/useBriefTemplates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: BriefTemplateRow | null;
  onSave: (data: Partial<BriefTemplateRow>) => Promise<void>;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "short_text", label: "Texto curto" },
  { value: "long_text", label: "Texto longo" },
  { value: "yes_no", label: "Sim/Não" },
  { value: "multiple_choice", label: "Escolha única" },
  { value: "checkbox", label: "Múltipla escolha" },
  { value: "file_upload", label: "Upload de arquivo" },
  { value: "link", label: "Link/URL" },
];

export default function TemplateEditor({ open, onOpenChange, template, onSave }: Props) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [category, setCategory] = useState(template?.category || "general");
  const [locale, setLocale] = useState(template?.locale || "pt");
  const [active, setActive] = useState(template?.active ?? true);
  const [questions, setQuestions] = useState<BriefQuestion[]>(template?.questions || []);
  const [saving, setSaving] = useState(false);

  // Reset on template change
  useState(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setCategory(template.category);
      setLocale(template.locale);
      setActive(template.active);
      setQuestions(template.questions);
    }
  });

  const addQuestion = () => {
    setQuestions([...questions, {
      id: `q_${Date.now()}`,
      label: "Nova pergunta",
      type: "short_text",
      required: false,
    }]);
  };

  const updateQuestion = (idx: number, patch: Partial<BriefQuestion>) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    const arr = [...questions];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setQuestions(arr);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ name, description, category, locale, active, questions });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card backdrop-blur-2xl border-border">
        <DialogHeader>
          <DialogTitle>{template ? "Editar template" : "Novo template"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Brief de Logo" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="general" />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <Label>Idioma padrão</Label>
              <Select value={locale} onValueChange={setLocale}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={active} onCheckedChange={setActive} />
              <Label>Template ativo</Label>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Perguntas ({questions.length})</h3>
              <Button size="sm" onClick={addQuestion}><Plus className="h-4 w-4" /> Adicionar</Button>
            </div>

            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={idx} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex flex-col gap-1 pt-2">
                      <button onClick={() => moveQuestion(idx, -1)} className="text-muted-foreground hover:text-foreground"><ChevronUp className="h-3 w-3" /></button>
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                      <button onClick={() => moveQuestion(idx, 1)} className="text-muted-foreground hover:text-foreground"><ChevronDown className="h-3 w-3" /></button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input
                        value={q.label}
                        onChange={e => updateQuestion(idx, { label: e.target.value })}
                        placeholder="Texto da pergunta"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select value={q.type} onValueChange={(v) => updateQuestion(idx, { type: v as FieldType })}>
                          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <Switch checked={q.required || false} onCheckedChange={(v) => updateQuestion(idx, { required: v })} />
                          <span className="text-xs text-muted-foreground">Obrigatória</span>
                        </div>
                      </div>
                      {(q.type === "multiple_choice" || q.type === "checkbox") && (
                        <Input
                          value={(q.options || []).join(", ")}
                          onChange={e => updateQuestion(idx, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                          placeholder="Opções separadas por vírgula"
                          className="text-xs"
                        />
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma pergunta. Clique em "Adicionar" para começar.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !name}>
            {saving ? "Salvando..." : "Salvar template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
