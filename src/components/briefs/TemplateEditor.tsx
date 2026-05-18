import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, GripVertical, Copy, ChevronDown, X, Eye, Pencil } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BriefTemplateRow, BriefQuestion, FieldType } from "@/hooks/useBriefTemplates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: BriefTemplateRow | null;
  onSave: (data: Partial<BriefTemplateRow>) => Promise<void>;
}

const FIELD_TYPES: { value: FieldType; label: string; group: string }[] = [
  { value: "short_text", label: "Texto curto", group: "Texto" },
  { value: "long_text", label: "Texto longo", group: "Texto" },
  { value: "email", label: "Email", group: "Texto" },
  { value: "link", label: "Link/URL", group: "Texto" },
  { value: "number", label: "Número", group: "Texto" },
  { value: "multiple_choice", label: "Escolha única", group: "Escolha" },
  { value: "checkbox", label: "Múltipla escolha", group: "Escolha" },
  { value: "dropdown", label: "Lista suspensa", group: "Escolha" },
  { value: "yes_no", label: "Sim/Não", group: "Escolha" },
  { value: "scale", label: "Escala linear", group: "Escolha" },
  { value: "grid", label: "Grade de múltipla escolha", group: "Escolha" },
  { value: "date", label: "Data", group: "Outros" },
  { value: "time", label: "Hora", group: "Outros" },
  { value: "file_upload", label: "Upload de arquivo", group: "Outros" },
  { value: "section", label: "Seção / Quebra", group: "Outros" },
];

const HAS_OPTIONS: FieldType[] = ["multiple_choice", "checkbox", "dropdown"];
const ALLOWS_OTHER: FieldType[] = ["multiple_choice", "checkbox", "dropdown"];

function newQuestion(type: FieldType = "short_text"): BriefQuestion {
  const base: BriefQuestion = {
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: type === "section" ? "Nova seção" : "Nova pergunta",
    type,
    required: false,
  };
  if (HAS_OPTIONS.includes(type)) base.options = ["Opção 1", "Opção 2"];
  if (type === "scale") { base.min = 1; base.max = 5; base.scaleMinLabel = ""; base.scaleMaxLabel = ""; }
  if (type === "grid") { base.gridRows = ["Linha 1"]; base.gridCols = ["Coluna 1", "Coluna 2"]; }
  return base;
}

export default function TemplateEditor({ open, onOpenChange, template, onSave }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [locale, setLocale] = useState("pt");
  const [active, setActive] = useState(true);
  const [questions, setQuestions] = useState<BriefQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(template?.name || "");
      setDescription(template?.description || "");
      setCategory(template?.category || "general");
      setLocale(template?.locale || "pt");
      setActive(template?.active ?? true);
      setQuestions(template?.questions || []);
      setTab("edit");
      setExpandedId(null);
    }
  }, [open, template]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addQuestion = (type: FieldType = "short_text") => {
    const q = newQuestion(type);
    setQuestions(prev => [...prev, q]);
    setExpandedId(q.id);
  };

  const updateQuestion = (id: string, patch: Partial<BriefQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const duplicateQuestion = (id: string) => {
    const idx = questions.findIndex(q => q.id === id);
    if (idx < 0) return;
    const copy: BriefQuestion = { ...questions[idx], id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` };
    const arr = [...questions];
    arr.splice(idx + 1, 0, copy);
    setQuestions(arr);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const oldIdx = questions.findIndex(q => q.id === a.id);
    const newIdx = questions.findIndex(q => q.id === over.id);
    setQuestions(arrayMove(questions, oldIdx, newIdx));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ name, description, category, locale, active, questions });
    setSaving(false);
    onOpenChange(false);
  };

  const requiredCount = questions.filter(q => q.required && q.type !== "section").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto backdrop-blur-2xl border-border bg-[sidebar-accent-foreground] bg-zinc-700">
        <DialogHeader>
          <DialogTitle>{template ? "Editar template" : "Novo template"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 bg-zinc-900/60 border border-white/10">
            <TabsTrigger
              value="edit"
              className="text-white/70 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="text-white/70 data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />Pré-visualizar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4">
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
                <div className="flex items-center gap-2">
                  <Select value="" onValueChange={(v) => addQuestion(v as FieldType)}>
                    <SelectTrigger className="w-44 h-8"><SelectValue placeholder="+ Adicionar campo" /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {questions.map(q => (
                      <SortableQuestion
                        key={q.id}
                        question={q}
                        expanded={expandedId === q.id}
                        onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
                        onUpdate={(patch) => updateQuestion(q.id, patch)}
                        onRemove={() => removeQuestion(q.id)}
                        onDuplicate={() => duplicateQuestion(q.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {questions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma pergunta. Use o seletor acima para adicionar.</p>
              )}
            </div>

            <div className="text-xs text-muted-foreground border-t border-border pt-2">
              {questions.length} pergunta(s) · {requiredCount} obrigatória(s)
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <PreviewPanel name={name} description={description} questions={questions} />
          </TabsContent>
        </Tabs>

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

// ======================= Sortable question =======================

function SortableQuestion({
  question, expanded, onToggle, onUpdate, onRemove, onDuplicate,
}: {
  question: BriefQuestion;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<BriefQuestion>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSection = question.type === "section";
  const typeLabel = FIELD_TYPES.find(t => t.value === question.type)?.label || question.type;

  return (
    <div ref={setNodeRef} style={style} className="rounded-xl border border-border bg-muted/30">
      <Collapsible open={expanded} onOpenChange={onToggle}>
        <div className="flex items-start gap-2 p-3">
          <button
            {...attributes}
            {...listeners}
            className="mt-1.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            aria-label="Arrastar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <Input
              value={question.label}
              onChange={e => onUpdate({ label: e.target.value })}
              placeholder={isSection ? "Título da seção" : "Texto da pergunta"}
              className="border-0 bg-transparent px-0 focus-visible:ring-0 font-medium"
            />
            <CollapsibleTrigger asChild>
              <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-0.5">
                <span>{typeLabel}</span>
                {question.required && <span className="text-destructive">*</span>}
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            </CollapsibleTrigger>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate} title="Duplicar">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRemove} title="Excluir">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <CollapsibleContent className="px-3 pb-3 space-y-3 border-t border-border/60 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Tipo de campo</Label>
              <Select value={question.type} onValueChange={(v) => onUpdate({ type: v as FieldType })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!isSection && (
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2">
                  <Switch checked={question.required || false} onCheckedChange={(v) => onUpdate({ required: v })} />
                  <Label className="text-xs">Obrigatória</Label>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Texto de ajuda (opcional)</Label>
            <Input
              value={question.helpText || ""}
              onChange={e => onUpdate({ helpText: e.target.value })}
              placeholder="Subtítulo ou instrução"
              className="h-9"
            />
          </div>

          {(question.type === "short_text" || question.type === "long_text" || question.type === "email" || question.type === "link" || question.type === "number") && (
            <div>
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={question.placeholder || ""}
                onChange={e => onUpdate({ placeholder: e.target.value })}
                placeholder="Ex: Digite aqui..."
                className="h-9"
              />
            </div>
          )}

          {question.type === "number" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Mínimo</Label>
                <Input type="number" value={question.min ?? ""} onChange={e => onUpdate({ min: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Máximo</Label>
                <Input type="number" value={question.max ?? ""} onChange={e => onUpdate({ max: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-9" />
              </div>
            </div>
          )}

          {question.type === "scale" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Mínimo</Label>
                  <Select value={String(question.min ?? 1)} onValueChange={(v) => onUpdate({ min: Number(v) })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0</SelectItem>
                      <SelectItem value="1">1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Máximo</Label>
                  <Select value={String(question.max ?? 5)} onValueChange={(v) => onUpdate({ max: Number(v) })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[2,3,4,5,6,7,8,9,10].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Rótulo mín</Label>
                  <Input value={question.scaleMinLabel || ""} onChange={e => onUpdate({ scaleMinLabel: e.target.value })} placeholder="Ex: Ruim" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Rótulo máx</Label>
                  <Input value={question.scaleMaxLabel || ""} onChange={e => onUpdate({ scaleMaxLabel: e.target.value })} placeholder="Ex: Ótimo" className="h-9" />
                </div>
              </div>
            </div>
          )}

          {HAS_OPTIONS.includes(question.type) && (
            <OptionsEditor
              options={question.options || []}
              onChange={(opts) => onUpdate({ options: opts })}
            />
          )}

          {ALLOWS_OTHER.includes(question.type) && (
            <div className="flex items-center gap-2">
              <Switch checked={question.allowOther || false} onCheckedChange={(v) => onUpdate({ allowOther: v })} />
              <Label className="text-xs">Adicionar opção "Outro"</Label>
            </div>
          )}

          {question.type === "grid" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Linhas</Label>
                <ListEditor items={question.gridRows || []} onChange={(arr) => onUpdate({ gridRows: arr })} placeholder="Linha" />
              </div>
              <div>
                <Label className="text-xs">Colunas</Label>
                <ListEditor items={question.gridCols || []} onChange={(arr) => onUpdate({ gridCols: arr })} placeholder="Coluna" />
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Opções</Label>
      <ListEditor items={options} onChange={onChange} placeholder="Opção" />
    </div>
  );
}

function ListEditor({ items, onChange, placeholder }: { items: string[]; onChange: (arr: string[]) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <Input
            value={item}
            onChange={e => {
              const arr = [...items];
              arr[idx] = e.target.value;
              onChange(arr);
            }}
            placeholder={`${placeholder} ${idx + 1}`}
            className="h-8 text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => onChange(items.filter((_, i) => i !== idx))}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="h-3 w-3 mr-1" /> Adicionar
      </Button>
    </div>
  );
}

// ======================= Preview =======================

function PreviewPanel({ name, description, questions }: { name: string; description: string; questions: BriefQuestion[] }) {
  const DARK = { color: "#18181b" } as const;
  const MUTED = { color: "#52525b" } as const;
  const FAINT = { color: "#71717a" } as const;
  return (
    <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-inner space-y-6 max-h-[70vh] overflow-y-auto" style={DARK}>
      <div className="space-y-2 pb-4 border-b border-zinc-200">
        <h2 className="text-2xl font-bold tracking-tight" style={DARK}>{name || "Sem título"}</h2>
        {description && <p className="text-sm leading-relaxed" style={MUTED}>{description}</p>}
      </div>

      {questions.map((q) => {
        if (q.type === "section") {
          return (
            <div key={q.id} className="pt-4 mt-2 border-t border-zinc-200">
              <h3 className="text-lg font-semibold" style={DARK}>{q.label}</h3>
              {q.helpText && <p className="text-sm mt-1" style={FAINT}>{q.helpText}</p>}
            </div>
          );
        }

        const labelEl = (
          <div>
            <Label className="text-sm font-medium" style={DARK}>
              <span style={DARK}>{q.label}</span>
              {q.required && <span className="ml-1" style={{ color: "#ef4444" }}>*</span>}
            </Label>
            {q.helpText && <p className="text-xs mt-1" style={FAINT}>{q.helpText}</p>}
          </div>
        );

        const inputBase = "w-full bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-900/20";

        let field: JSX.Element;
        switch (q.type) {
          case "long_text":
            field = <Textarea disabled placeholder={q.placeholder || "Scrivi qui la tua risposta…"} rows={4} className={inputBase} />;
            break;
          case "email":
            field = <Input type="email" disabled placeholder={q.placeholder || "nome@email.com"} className={inputBase} />;
            break;
          case "link":
            field = <Input type="url" disabled placeholder={q.placeholder || "https://"} className={inputBase} />;
            break;
          case "number":
            field = <Input type="number" disabled placeholder={q.placeholder || "0"} min={q.min} max={q.max} className={inputBase} />;
            break;
          case "date":
            field = <Input type="date" disabled className={inputBase} />;
            break;
          case "time":
            field = <Input type="time" disabled className={inputBase} />;
            break;
          case "file_upload":
            field = (
              <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center text-sm text-zinc-500 bg-zinc-50">
                Trascina un file qui o clicca per caricare
              </div>
            );
            break;
          case "yes_no":
            field = (
              <div className="flex gap-2">
                {["Sì", "No"].map((opt) => (
                  <div key={opt} className="flex-1 border border-zinc-300 rounded-md px-4 py-2.5 text-sm text-zinc-700 bg-white text-center">
                    {opt}
                  </div>
                ))}
              </div>
            );
            break;
          case "multiple_choice":
          case "checkbox": {
            const isMulti = q.type === "checkbox";
            const opts = [...(q.options || []), ...(q.allowOther ? ["Altro…"] : [])];
            field = (
              <div className="space-y-2">
                {opts.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-zinc-200 bg-white">
                    <div className={`h-4 w-4 shrink-0 border border-zinc-400 ${isMulti ? "rounded-sm" : "rounded-full"}`} />
                    <span className="text-sm text-zinc-700">{opt}</span>
                  </div>
                ))}
              </div>
            );
            break;
          }
          case "dropdown":
            field = (
              <div className={`${inputBase} h-10 px-3 flex items-center justify-between rounded-md text-sm text-zinc-400`}>
                <span>Seleziona…</span>
                <ChevronDown className="h-4 w-4" />
              </div>
            );
            break;
          case "scale": {
            const min = q.min ?? 1;
            const max = q.max ?? 5;
            const steps = [];
            for (let i = min; i <= max; i++) steps.push(i);
            field = (
              <div>
                <div className="flex items-center justify-between gap-2">
                  {steps.map((n) => (
                    <div key={n} className="flex flex-col items-center gap-1.5 flex-1">
                      <div className="h-8 w-8 rounded-full border border-zinc-300 bg-white flex items-center justify-center text-xs text-zinc-600">
                        {n}
                      </div>
                    </div>
                  ))}
                </div>
                {(q.scaleMinLabel || q.scaleMaxLabel) && (
                  <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
                    <span>{q.scaleMinLabel}</span>
                    <span>{q.scaleMaxLabel}</span>
                  </div>
                )}
              </div>
            );
            break;
          }
          case "grid": {
            const rows = q.gridRows || [];
            const cols = q.gridCols || [];
            field = (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th></th>
                      {cols.map((c, i) => (
                        <th key={i} className="px-2 py-2 text-zinc-600 font-medium text-center text-xs">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b border-zinc-100">
                        <td className="py-2 pr-2 text-zinc-700">{r}</td>
                        {cols.map((_, j) => (
                          <td key={j} className="px-2 py-2 text-center">
                            <div className="h-4 w-4 mx-auto rounded-full border border-zinc-400" />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            break;
          }
          case "short_text":
          default:
            field = <Input disabled placeholder={q.placeholder || "La tua risposta"} className={inputBase} />;
        }

        return (
          <div key={q.id} className="space-y-2">
            {labelEl}
            {field}
          </div>
        );
      })}

      {questions.length === 0 && (
        <p className="text-sm text-zinc-500 text-center py-8">Nenhuma pergunta para visualizar.</p>
      )}

      <div className="pt-4 border-t border-zinc-200">
        <button
          type="button"
          disabled
          className="w-full h-11 rounded-md bg-zinc-900 text-white text-sm font-medium opacity-90"
        >
          Invia risposte
        </button>
      </div>
    </div>
  );
}

