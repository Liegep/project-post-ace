import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { BriefTemplateRow } from "@/hooks/useBriefTemplates";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  template: BriefTemplateRow | null;
  onAssign: (templateId: string, clientId: string, title: string, dueDate?: string) => Promise<void>;
}

export default function AssignTemplateDialog({ open, onOpenChange, template, onAssign }: Props) {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("clients").select("id, name").order("name").then(({ data }) => {
        setClients(data || []);
      });
      setTitle(template?.name || "");
      setClientId("");
      setDueDate("");
    }
  }, [open, template]);

  const handleAssign = async () => {
    if (!template || !clientId || !title) return;
    setSaving(true);
    await onAssign(template.id, clientId, title, dueDate || undefined);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card backdrop-blur-2xl border-border">
        <DialogHeader>
          <DialogTitle>Enviar para cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cliente</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Título do envio</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Brief inicial 2026" />
          </div>
          <div>
            <Label>Prazo (opcional)</Label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={saving || !clientId || !title}>
            {saving ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
