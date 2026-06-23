import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useContracts, Contract } from "@/hooks/useContracts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil, FileText, ArrowLeft, CheckCircle2, Clock, XCircle, Eye } from "lucide-react";

interface ClientOption {
  id: string;
  name: string;
}

const STATUS_MAP: Record<string, { label: string; icon: any; class: string }> = {
  pending: { label: "Pendente", icon: Clock, class: "bg-amber-500/15 text-amber-600" },
  accepted: { label: "Aceito", icon: CheckCircle2, class: "bg-emerald-500/15 text-emerald-600" },
  cancelled: { label: "Cancelado", icon: XCircle, class: "bg-red-500/15 text-red-500" },
};

const ContractsPage = () => {
  const navigate = useNavigate();
  const { userId, isSuperAdmin, loading: roleLoading } = useUserRole();
  const { contracts, loading, createContract, updateContract, deleteContract } = useContracts();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isSuperAdmin) {
      navigate("/admin");
    }
  }, [roleLoading, isSuperAdmin, navigate]);

  useEffect(() => {
    supabase.from("clients").select("id, name").order("name").then(({ data }) => {
      if (data) setClients(data);
    });
  }, []);

  const openNew = () => {
    setEditing(null);
    setTitle("");
    setBody("");
    setClientId("");
    setDialogOpen(true);
  };

  const openEdit = (c: Contract) => {
    setEditing(c);
    setTitle(c.title);
    setBody(c.body);
    setClientId(c.client_id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim() || !clientId) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await updateContract(editing.id, { title, body });
      if (error) toast({ title: "Erro ao atualizar", variant: "destructive" });
      else toast({ title: "Contrato atualizado!" });
    } else {
      const { error } = await createContract(clientId, title, body, userId!);
      if (error) toast({ title: "Erro ao criar", variant: "destructive" });
      else toast({ title: "Contrato criado!" });
    }
    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este contrato?")) return;
    await deleteContract(id);
    toast({ title: "Contrato excluído" });
  };

  if (roleLoading || !isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="group bg-white hover:bg-foreground shadow-md border border-border/40 transition-colors" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-5 w-5 text-black group-hover:text-white transition-colors" strokeWidth={2.5} />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Gestão de Contratos
              </h1>
              <p className="text-xs text-muted-foreground">Exclusivo Super Admin</p>
            </div>
          </div>
          <Button onClick={openNew} className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-pink-500 text-white">
            <Plus className="h-4 w-4" /> Novo Contrato
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : contracts.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum contrato criado ainda.</p>
              <Button onClick={openNew} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Criar primeiro contrato
              </Button>
            </CardContent>
          </Card>
        ) : (
          contracts.map((c) => {
            const st = STATUS_MAP[c.status] || STATUS_MAP.pending;
            const StIcon = st.icon;
            return (
              <Card key={c.id} className="animate-in fade-in-50 duration-300">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">Cliente: {c.client_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={st.class + " gap-1"}>
                      <StIcon className="h-3 w-3" /> {st.label}
                    </Badge>
                    <Button variant="ghost" size="icon" title="Visualizar como cliente" onClick={() => { setPreviewContract(c); setPreviewOpen(true); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground line-clamp-4 prose prose-sm prose-invert max-w-none [&_strong]:text-foreground [&_b]:text-foreground" dangerouslySetInnerHTML={{ __html: c.body }} />
                  <p className="text-xs text-muted-foreground mt-3">
                    Criado em {new Date(c.created_at).toLocaleDateString("pt-BR")} · O contrato aparece automaticamente para o cliente no próximo login.
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Contrato" : "Novo Contrato"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId} disabled={!!editing}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título do Contrato</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Contrato de Prestação de Serviços" />
            </div>
            <div>
              <Label>Texto do Contrato</Label>
              <RichTextEditor
                content={body}
                onChange={setBody}
                placeholder="Digite o texto completo do contrato..."
                className="min-h-[300px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                if (!title.trim() || !body.trim()) {
                  toast({ title: "Preencha título e texto para visualizar", variant: "destructive" });
                  return;
                }
                setPreviewContract({
                  id: "preview", client_id: clientId, title, body,
                  status: "pending", created_by: "", created_at: new Date().toISOString(), updated_at: "",
                });
                setPreviewOpen(true);
              }}
            >
              <Eye className="h-4 w-4" /> Visualizar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
              {saving ? "Salvando..." : editing ? "Atualizar" : "Criar e Enviar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog — replicates client view */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden p-0 bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader className="px-8 pt-8 pb-4 text-center border-b border-white/10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-bold font-serif tracking-tight text-center">
              {previewContract?.title || "Contrato"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">Pré-visualização — assim o cliente verá o contrato no login</p>
          </DialogHeader>
          <ScrollArea className="px-8 py-6 max-h-[55vh]">
            <div
              className="prose prose-sm dark:prose-invert max-w-none font-serif leading-relaxed"
              dangerouslySetInnerHTML={{ __html: previewContract?.body || "" }}
            />
          </ScrollArea>
          <div className="px-8 pb-8 pt-4 border-t border-white/10 text-center">
            <Button disabled size="lg" className="w-full max-w-sm gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-base h-12 rounded-xl">
              <CheckCircle2 className="h-5 w-5" /> Li e Aceito os Termos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractsPage;
