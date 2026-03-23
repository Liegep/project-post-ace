import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { TextContentType, TextContentStatus, CONTENT_TYPE_LABELS, TEXT_STATUS_LABELS } from "@/hooks/useTextContents";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    content_type: TextContentType;
    title: string;
    subtitle: string;
    body: string;
    status: TextContentStatus;
    planned_date: string | null;
    observations: string;
  }) => Promise<boolean>;
  initial?: {
    content_type?: TextContentType;
    title?: string;
    subtitle?: string;
    body?: string;
    status?: TextContentStatus;
    planned_date?: string | null;
    observations?: string;
  };
  mode?: "create" | "edit";
}

export function CreateTextContentDialog({ open, onOpenChange, onSave, initial, mode = "create" }: Props) {
  const [contentType, setContentType] = useState<TextContentType>(initial?.content_type || "texto");
  const [title, setTitle] = useState(initial?.title || "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle || "");
  const [body, setBody] = useState(initial?.body || "");
  const [status, setStatus] = useState<TextContentStatus>(initial?.status || "draft");
  const [plannedDate, setPlannedDate] = useState(initial?.planned_date || "");
  const [observations, setObservations] = useState(initial?.observations || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const ok = await onSave({
      content_type: contentType,
      title: title.trim(),
      subtitle: subtitle.trim(),
      body,
      status,
      planned_date: plannedDate || null,
      observations: observations.trim(),
    });
    setSaving(false);
    if (ok) {
      if (mode === "create") {
        setTitle(""); setSubtitle(""); setBody(""); setObservations(""); setPlannedDate("");
        setContentType("texto"); setStatus("draft");
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar Conteúdo" : "Novo Conteúdo Textual"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo de Conteúdo</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as TextContentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CONTENT_TYPE_LABELS) as TextContentType[]).map((k) => (
                    <SelectItem key={k} value={k}>{CONTENT_TYPE_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TextContentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TEXT_STATUS_LABELS) as TextContentStatus[]).map((k) => (
                    <SelectItem key={k} value={k}>{TEXT_STATUS_LABELS[k].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do conteúdo" />
          </div>

          <div>
            <Label className="text-xs">Subtítulo / Resumo</Label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Resumo curto do conteúdo" />
          </div>

          <div>
            <Label className="text-xs">Texto Completo</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escreva o conteúdo completo aqui..."
              className="min-h-[200px] leading-relaxed"
            />
          </div>

          <div>
            <Label className="text-xs">Data Planejada</Label>
            <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
          </div>

          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Notas internas ou observações..."
              className="min-h-[60px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? "Salvando..." : mode === "edit" ? "Salvar" : "Criar Conteúdo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
