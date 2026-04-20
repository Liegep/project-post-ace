import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, Send, Eye, RotateCcw, Search, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useBriefTemplates, useBriefAssignments, type BriefTemplateRow } from "@/hooks/useBriefTemplates";
import TemplateEditor from "./TemplateEditor";
import AssignTemplateDialog from "./AssignTemplateDialog";
import FillBriefDialog from "./FillBriefDialog";

export default function TemplatesManager() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useBriefTemplates();
  const { assignments, responses, createAssignment, upsertResponse, reopenAssignment, deleteAssignment } = useBriefAssignments();
  const [clients, setClients] = useState<Record<string, string>>({});

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<BriefTemplateRow | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTemplate, setAssignTemplate] = useState<BriefTemplateRow | null>(null);

  const [viewOpen, setViewOpen] = useState(false);
  const [viewAssignmentId, setViewAssignmentId] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("clients").select("id, name").then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach((c: any) => { map[c.id] = c.name; });
      setClients(map);
    });
  }, []);

  const openNew = () => {
    setEditingTemplate(null);
    setEditorKey(k => k + 1);
    setEditorOpen(true);
  };

  const openEdit = (t: BriefTemplateRow) => {
    setEditingTemplate(t);
    setEditorKey(k => k + 1);
    setEditorOpen(true);
  };

  const handleSaveTemplate = async (data: Partial<BriefTemplateRow>) => {
    if (editingTemplate) {
      const ok = await updateTemplate(editingTemplate.id, data);
      if (ok) toast({ title: "Template atualizado" });
    } else {
      const created = await createTemplate(data);
      if (created) toast({ title: "Template criado" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir template? Os envios e respostas vinculados também serão removidos.")) return;
    const ok = await deleteTemplate(id);
    if (ok) toast({ title: "Template excluído" });
  };

  const handleAssign = async (templateId: string, clientId: string, title: string, dueDate?: string) => {
    const created = await createAssignment(templateId, clientId, title, dueDate);
    if (created) toast({ title: "Brief enviado para o cliente" });
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const viewAssignment = assignments.find(a => a.id === viewAssignmentId) || null;
  const viewResponse = responses.find(r => r.assignment_id === viewAssignmentId) || null;
  const viewTemplate = viewAssignment ? templates.find(t => t.id === viewAssignment.template_id) || null : null;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="templates" className="w-full">
        <TabsList>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="responses">Respostas ({responses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar templates..." className="pl-9" />
            </div>
            <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo template</Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum template ainda. Crie um para começar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTemplates.map(t => {
                const usageCount = assignments.filter(a => a.template_id === t.id).length;
                return (
                  <div key={t.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-1">{t.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description || "Sem descrição"}</p>
                      </div>
                      {!t.active && <Badge variant="secondary" className="text-[10px]">Inativo</Badge>}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                      <Badge variant="outline" className="text-[10px]">{t.questions.length} perguntas</Badge>
                      <Badge variant="outline" className="text-[10px]">{usageCount} envios</Badge>
                    </div>
                    <div className="flex items-center gap-1 pt-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setAssignTemplate(t); setAssignOpen(true); }}>
                        <Send className="h-3 w-3" /> Enviar
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(t)}><Edit2 className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="responses" className="space-y-3">
          {assignments.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">Nenhum envio ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map(a => {
                const tpl = templates.find(t => t.id === a.template_id);
                const resp = responses.find(r => r.assignment_id === a.id);
                const statusLabel =
                  a.status === "submitted" ? "Enviado" :
                  a.status === "reopened" ? "Reaberto" : "Pendente";
                const statusVariant: "default" | "secondary" | "outline" =
                  a.status === "submitted" ? "default" : a.status === "reopened" ? "secondary" : "outline";
                return (
                  <div key={a.id} className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{a.title}</h4>
                        <Badge variant={statusVariant} className="text-[10px]">{statusLabel}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {clients[a.client_id] || "Cliente"} · {tpl?.name || "Template removido"}
                        {resp?.submitted_at && ` · enviado em ${format(new Date(resp.submitted_at), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => { setViewAssignmentId(a.id); setViewOpen(true); }}>
                        <Eye className="h-3 w-3" /> Ver
                      </Button>
                      {a.status === "submitted" && (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          const ok = await reopenAssignment(a.id);
                          if (ok) toast({ title: "Brief reaberto para edição do cliente" });
                        }}>
                          <RotateCcw className="h-3 w-3" /> Reabrir
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={async () => {
                        if (!confirm("Excluir este envio e suas respostas?")) return;
                        const ok = await deleteAssignment(a.id);
                        if (ok) toast({ title: "Envio excluído" });
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TemplateEditor
        key={editorKey}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={handleSaveTemplate}
      />

      <AssignTemplateDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        template={assignTemplate}
        onAssign={handleAssign}
      />

      <FillBriefDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        template={viewTemplate}
        assignment={viewAssignment}
        response={viewResponse}
        readOnly
        onSave={async () => {}}
      />
    </div>
  );
}
