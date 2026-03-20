import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { FileText, CalendarIcon, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { BriefSimilarityPanel } from "@/components/BriefSimilarityPanel";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  plannedDate?: Date | null;
  alreadyConverted?: boolean;
  onCreated?: (briefId: string) => void;
}

interface ClientOption {
  id: string;
  name: string;
}

export function CreateBriefFromIdeaDialog({
  open,
  onOpenChange,
  title: initialTitle,
  description: initialDescription,
  plannedDate: initialDate,
  alreadyConverted,
  onCreated,
}: Props) {
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [plannedDate, setPlannedDate] = useState<Date | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle);
    setDescription(initialDescription || "");
    setPlannedDate(initialDate || undefined);
    setSelectedClient("");
    loadClients();
  }, [open, initialTitle, initialDescription, initialDate]);

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

    const payload: any = {
      client_id: selectedClient,
      title: title.trim(),
      description: description.trim(),
      status: "draft" as const,
      created_by: user?.id || null,
    };

    if (plannedDate) {
      payload.planned_date = format(plannedDate, "yyyy-MM-dd");
    }

    const { data, error } = await supabase.from("content_briefs").insert(payload).select("id").single();

    if (error) {
      toast({ title: "Erro ao criar pauta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pauta criada!", description: `"${title.trim()}" foi adicionada como rascunho.` });
      onCreated?.(data.id);
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
            Criar Pauta
          </DialogTitle>
        </DialogHeader>

        {alreadyConverted && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Essa ideia já foi usada para criar uma pauta anteriormente. Você pode criar novamente se desejar.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Cliente *</Label>
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

          <div>
            <Label className="text-xs">Data planejada (opcional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !plannedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {plannedDate ? format(plannedDate, "dd/MM/yyyy") : "Escolher data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={plannedDate}
                  onSelect={setPlannedDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

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
