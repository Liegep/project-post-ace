import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Zap, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Column } from "@/types/post";

interface Automation {
  id: string;
  client_id: string;
  name: string;
  trigger_type: string;
  trigger_column_id: string | null;
  trigger_value: string;
  action_type: string;
  action_value: string;
  active: boolean;
}

interface KanbanAutomationsPanelProps {
  clientId: string;
  columns: Column[];
}

const TRIGGER_TYPES = [
  { value: "column_move", label: "Quando mover para a coluna..." },
  { value: "tag_added", label: "Quando adicionar a tag..." },
];

const ACTION_TYPES = [
  { value: "add_tag", label: "Adicionar tag" },
  { value: "change_color", label: "Mudar cor do card" },
  { value: "mark_done", label: "Marcar como finalizado (arquivar)" },
  { value: "move_to_column", label: "Mover para a coluna..." },
];

const COLOR_OPTIONS = [
  { value: "#ef4444", label: "Vermelho" },
  { value: "#f59e0b", label: "Amarelo" },
  { value: "#22c55e", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#06b6d4", label: "Ciano" },
  { value: "#f97316", label: "Laranja" },
];

export function KanbanAutomationsPanel({ clientId, columns }: KanbanAutomationsPanelProps) {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [existingTags, setExistingTags] = useState<string[]>([]);

  // New automation form
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState("column_move");
  const [triggerColumnId, setTriggerColumnId] = useState("");
  const [triggerValue, setTriggerValue] = useState("");
  const [actionType, setActionType] = useState("add_tag");
  const [actionValue, setActionValue] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchAutomations = async () => {
    const { data } = await supabase
      .from("kanban_automations")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    setAutomations((data as any[]) || []);
    setLoading(false);
  };

  const fetchTags = async () => {
    const { data } = await supabase
      .from("posts")
      .select("tags")
      .eq("client_id", clientId);
    const allTags = new Set<string>();
    (data || []).forEach((p: any) => (p.tags || []).forEach((t: string) => allTags.add(t)));
    setExistingTags(Array.from(allTags).sort());
  };

  useEffect(() => {
    fetchAutomations();
    fetchTags();
  }, [clientId]);

  const handleAdd = async () => {
    if (!name.trim() || !actionType) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    // Validate trigger
    if (triggerType === "column_move" && !triggerColumnId) {
      toast({ title: "Selecione a coluna de gatilho", variant: "destructive" });
      return;
    }
    if (triggerType === "tag_added" && !triggerValue.trim()) {
      toast({ title: "Informe a tag de gatilho", variant: "destructive" });
      return;
    }

    // Validate action value
    if (actionType === "add_tag" && !actionValue.trim()) {
      toast({ title: "Informe o nome da tag", variant: "destructive" });
      return;
    }
    if (actionType === "change_color" && !actionValue.trim()) {
      toast({ title: "Selecione uma cor", variant: "destructive" });
      return;
    }
    if (actionType === "move_to_column" && !actionValue.trim()) {
      toast({ title: "Selecione a coluna de destino", variant: "destructive" });
      return;
    }

    setAdding(true);
    const { error } = await supabase.from("kanban_automations").insert({
      client_id: clientId,
      name: name.trim(),
      trigger_type: triggerType,
      trigger_column_id: triggerType === "column_move" ? triggerColumnId : null,
      trigger_value: triggerType === "tag_added" ? triggerValue.trim() : "",
      action_type: actionType,
      action_value: actionType === "mark_done" ? "true" : actionValue.trim(),
    } as any);

    if (!error) {
      toast({ title: "Automação criada!" });
      setName("");
      setTriggerType("column_move");
      setTriggerColumnId("");
      setTriggerValue("");
      setActionType("add_tag");
      setActionValue("");
      fetchAutomations();
    } else {
      toast({ title: "Erro ao criar automação", variant: "destructive" });
    }
    setAdding(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("kanban_automations").update({ active } as any).eq("id", id);
    setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, active } : a)));
    toast({ title: active ? "Automação ativada" : "Automação desativada" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta automação?")) return;
    await supabase.from("kanban_automations").delete().eq("id", id);
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Automação excluída" });
  };

  const getColumnName = (colId: string) => columns.find((c) => c.id === colId)?.name || "—";

  const getTriggerLabel = (auto: Automation) => {
    if (auto.trigger_type === "tag_added") {
      return <>Quando adicionar tag <span className="font-medium text-foreground">"{auto.trigger_value}"</span></>;
    }
    return <>Quando mover para <span className="font-medium text-foreground">"{getColumnName(auto.trigger_column_id || "")}"</span></>;
  };

  const getActionLabel = (type: string, value: string) => {
    switch (type) {
      case "add_tag": return `Adicionar tag "${value}"`;
      case "change_color": return (
        <span className="flex items-center gap-1.5">
          Mudar cor para <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: value }} />
        </span>
      );
      case "mark_done": return "Arquivar card";
      case "move_to_column": return `Mover para "${getColumnName(value)}"`;
      default: return value;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="h-5 w-5 text-amber-500" />
        <h3 className="text-sm font-semibold">Automações do Kanban</h3>
      </div>

      {/* Existing automations */}
      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : automations.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma automação configurada.</p>
      ) : (
        <div className="space-y-2">
          {automations.map((a) => (
            <Card key={a.id} className={`transition-opacity ${!a.active ? "opacity-50" : ""}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium truncate">{a.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>{getTriggerLabel(a)}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium text-foreground">{getActionLabel(a.action_type, a.action_value)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={a.active}
                      onCheckedChange={(v) => toggleActive(a.id, v)}
                    />
                    <button onClick={() => handleDelete(a.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add new automation */}
      <div className="rounded-lg border border-dashed p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">Nova Automação</p>

        <div>
          <Label className="text-xs">Nome</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Auto-tag Urgente"
            className="mt-1"
          />
        </div>

        {/* Trigger type */}
        <div>
          <Label className="text-xs">Gatilho</Label>
          <Select value={triggerType} onValueChange={(v) => { setTriggerType(v); setTriggerColumnId(""); setTriggerValue(""); }}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIGGER_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Trigger value - column or tag */}
        {triggerType === "column_move" && (
          <div>
            <Label className="text-xs">Coluna de gatilho</Label>
            <Select value={triggerColumnId} onValueChange={setTriggerColumnId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {triggerType === "tag_added" && (
          <div>
            <Label className="text-xs">Tag de gatilho</Label>
            {existingTags.length > 0 ? (
              <Select value={triggerValue} onValueChange={setTriggerValue}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione ou digite a tag" />
                </SelectTrigger>
                <SelectContent>
                  {existingTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
                placeholder="Nome da tag"
                className="mt-1"
              />
            )}
            {existingTags.length > 0 && (
              <Input
                value={triggerValue}
                onChange={(e) => setTriggerValue(e.target.value)}
                placeholder="Ou digite uma tag personalizada"
                className="mt-1.5 text-xs"
              />
            )}
          </div>
        )}

        {/* Action */}
        <div>
          <Label className="text-xs">Ação</Label>
          <Select value={actionType} onValueChange={(v) => { setActionType(v); setActionValue(""); }}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((at) => (
                <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action value fields */}
        {actionType === "add_tag" && (
          <div>
            <Label className="text-xs">Nome da tag</Label>
            <Input
              value={actionValue}
              onChange={(e) => setActionValue(e.target.value)}
              placeholder="Ex: Urgente"
              className="mt-1"
            />
          </div>
        )}

        {actionType === "change_color" && (
          <div>
            <Label className="text-xs">Cor</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setActionValue(c.value)}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${actionValue === c.value ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        )}

        {actionType === "move_to_column" && (
          <div>
            <Label className="text-xs">Coluna de destino</Label>
            <Select value={actionValue} onValueChange={setActionValue}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione a coluna" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button size="sm" onClick={handleAdd} disabled={adding} className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Criar Automação
        </Button>
      </div>
    </div>
  );
}
