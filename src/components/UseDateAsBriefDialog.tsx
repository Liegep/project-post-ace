import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateName: string;
  dateMonth: number;
  dateDay: number;
  dateDescription?: string;
}

interface ClientOption {
  id: string;
  name: string;
}

export function UseDateAsBriefDialog({ open, onOpenChange, dateName, dateMonth, dateDay, dateDescription }: Props) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(dateName);
    setDescription(dateDescription || `Conteúdo inspirado na data comemorativa: ${dateName} (${dateDay}/${dateMonth})`);
    setSelectedClient("");
    loadClients();
  }, [open, dateName, dateMonth, dateDay, dateDescription]);

  const loadClients = async () => {
    setLoadingClients(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingClients(false); return; }

    const [assignedRes, ownedRes, sharedRes] = await Promise.all([
      supabase.from("user_client_assignments").select("client_id").eq("user_id", user.id),
      supabase.from("clients").select("id").eq("owner_id", user.id),
      supabase.from("clients").select("id").eq("shared", true),
    ]);

    const ids = [...new Set([
      ...(assignedRes.data || []).map((a: any) => a.client_id),
      ...(ownedRes.data || []).map((c: any) => c.id),
      ...(sharedRes.data || []).map((c: any) => c.id),
    ])];

    if (ids.length > 0) {
      const { data } = await supabase.from("clients").select("id, name").in("id", ids).order("name");
      setClients((data as ClientOption[]) || []);
      if (data && data.length === 1) setSelectedClient(data[0].id);
    } else {
      setClients([]);
    }
    setLoadingClients(false);
  };

  const handleCreate = async () => {
    if (!selectedClient || !title.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    const currentYear = new Date().getFullYear();
    const plannedDate = `${currentYear}-${String(dateMonth).padStart(2, "0")}-${String(dateDay).padStart(2, "0")}`;

    const { error } = await supabase.from("content_briefs").insert({
      client_id: selectedClient,
      title: title.trim(),
      description: description.trim(),
      planned_date: plannedDate,
      status: "draft",
      created_by: user?.id || null,
    });

    if (error) {
      toast({ title: "Erro ao criar pauta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pauta criada!", description: `"${title.trim()}" foi adicionada como pauta.` });
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Usar como Pauta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Cliente</Label>
            {loadingClients ? (
              <div className="h-9 rounded-md border bg-muted animate-pulse" />
            ) : clients.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nenhum cliente disponível</p>
            ) : (
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <Label className="text-xs">Título da pauta</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Data planejada: {dateDay}/{dateMonth}/{new Date().getFullYear()}
          </p>
          <Button
            onClick={handleCreate}
            disabled={!selectedClient || !title.trim() || saving}
            className="w-full"
          >
            {saving ? "Criando..." : "Criar Pauta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
