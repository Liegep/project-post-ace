import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useProposals, ProposalService } from "@/hooks/useProposals";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Copy, Send, Eye, Clock, FileText, X, Save, FolderOpen, Pencil } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CURRENCIES } from "@/lib/currency";
import { ProposalLocale, PROPOSAL_LOCALE_LABELS, PROPOSAL_LOCALE_FLAGS } from "@/i18n/proposalTranslations";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  sent: { label: "Enviada", className: "bg-blue-500/15 text-blue-600" },
  viewed: { label: "Visualizada", className: "bg-emerald-500/15 text-emerald-600" },
  accepted: { label: "Aceita", className: "bg-green-500/15 text-green-700" },
  expired: { label: "Expirada", className: "bg-destructive/15 text-destructive" },
};

interface ProposalTemplate {
  id: string;
  name: string;
  scope_description: string;
  investment_description: string;
  services: ProposalService[];
  currency: string;
  locale: string;
}

export default function ProposalsPage() {
  const navigate = useNavigate();
  const { userId, isSuperAdmin } = useUserRole();
  const { proposals, loading, refetch } = useProposals();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Templates
  const [templates, setTemplates] = useState<ProposalTemplate[]>([]);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [scopeDescription, setScopeDescription] = useState("");
  const [investmentDescription, setInvestmentDescription] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [deadlineDays, setDeadlineDays] = useState(7);
  const [locale, setLocale] = useState<ProposalLocale>("pt");
  const [proposalType, setProposalType] = useState("project");
  const [plan, setPlan] = useState("");
  const [piecesQuantity, setPiecesQuantity] = useState(0);
  const [services, setServices] = useState<ProposalService[]>([{ name: "", description: "", value: 0 }]);

  const totalValue = services.reduce((s, svc) => s + (svc.value || 0), 0);

  const fetchTemplates = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("proposal_templates")
      .select("*")
      .order("name");
    if (data) {
      setTemplates(
        data.map((t: any) => ({
          ...t,
          services: Array.isArray(t.services) ? t.services : JSON.parse(t.services || "[]"),
        }))
      );
    }
  }, [userId]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const resetForm = () => {
    setEditingId(null);
    setClientName("");
    setClientEmail("");
    setScopeDescription("");
    setInvestmentDescription("");
    setCurrency("BRL");
    setDeadlineDays(7);
    setLocale("pt");
    setProposalType("project");
    setPlan("");
    setPiecesQuantity(0);
    setServices([{ name: "", description: "", value: 0 }]);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setClientName(p.client_name || "");
    setClientEmail(p.client_email || "");
    setScopeDescription(p.scope_description || "");
    setInvestmentDescription(p.investment_description || "");
    setCurrency(p.currency || "BRL");
    setDeadlineDays(p.deadline_days || 7);
    setLocale((p.locale || "pt") as ProposalLocale);
    setProposalType(p.proposal_type || "project");
    setPlan(p.plan || "");
    setPiecesQuantity(p.pieces_quantity || 0);
    setServices(p.services?.length ? p.services : [{ name: "", description: "", value: 0 }]);
    setDialogOpen(true);
  };

  const loadTemplate = (tpl: ProposalTemplate) => {
    setScopeDescription(tpl.scope_description);
    setInvestmentDescription(tpl.investment_description);
    setCurrency(tpl.currency);
    setLocale((tpl.locale || "pt") as ProposalLocale);
    setServices(tpl.services.length > 0 ? tpl.services : [{ name: "", description: "", value: 0 }]);
    toast({ title: `Template "${tpl.name}" carregado` });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({ title: "Informe o nome do template", variant: "destructive" });
      return;
    }
    setSavingTemplate(true);
    const { error } = await supabase.from("proposal_templates").insert({
      user_id: userId!,
      name: templateName.trim(),
      scope_description: scopeDescription.trim(),
      investment_description: investmentDescription.trim(),
      services: services.filter((s) => s.name.trim()) as any,
      currency,
      locale,
    });
    setSavingTemplate(false);
    if (error) {
      toast({ title: "Erro ao salvar template", variant: "destructive" });
    } else {
      toast({ title: "Template salvo!" });
      setTemplateDialogOpen(false);
      setTemplateName("");
      fetchTemplates();
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    await supabase.from("proposal_templates").delete().eq("id", id);
    toast({ title: "Template excluído" });
    fetchTemplates();
  };

  const handleCreate = async () => {
    if (!clientName.trim()) {
      toast({ title: "Informe o nome do cliente", variant: "destructive" });
      return;
    }
    if (services.every((s) => !s.name.trim())) {
      toast({ title: "Adicione pelo menos um serviço", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      client_name: clientName.trim(),
      client_email: clientEmail.trim(),
      scope_description: scopeDescription.trim(),
      investment_description: investmentDescription.trim(),
      currency,
      deadline_days: deadlineDays,
      locale,
      proposal_type: proposalType,
      plan,
      pieces_quantity: piecesQuantity,
      services: services.filter((s) => s.name.trim()) as any,
      total_value: totalValue,
    };
    const { error } = editingId
      ? await supabase.from("proposals").update(payload).eq("id", editingId)
      : await supabase.from("proposals").insert({ ...payload, user_id: userId! });
    setSaving(false);
    if (error) {
      toast({ title: editingId ? "Erro ao atualizar proposta" : "Erro ao criar proposta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Proposta atualizada!" : "Proposta criada com sucesso!" });
      setDialogOpen(false);
      resetForm();
      refetch();
    }
  };

  const handleSend = async (id: string) => {
    await supabase.from("proposals").update({ status: "sent" as any }).eq("id", id);
    toast({ title: "Proposta marcada como enviada" });
    refetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("proposals").delete().eq("id", id);
    toast({ title: "Proposta excluída" });
    refetch();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/proposta/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="group bg-white hover:bg-foreground shadow-md border border-border/40 transition-colors" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5 text-black group-hover:text-white transition-colors" strokeWidth={2.5} />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Propostas Comerciais</h1>
              <p className="text-xs text-muted-foreground">
                {isSuperAdmin ? "Todas as propostas" : "Suas propostas"}
              </p>
            </div>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Proposta
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-12">Carregando...</div>
        ) : proposals.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Nenhuma proposta criada ainda.</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Criar Primeira Proposta
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {proposals.map((p) => {
              const badge = STATUS_BADGE[p.status] || STATUS_BADGE.draft;
              const daysLeft = Math.max(0, differenceInDays(new Date(p.expires_at), new Date()));
              const pLocale = (p as any).locale as string | undefined;
              return (
                <Card key={p.id} className="relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{p.client_name}</CardTitle>
                        {p.client_email && (
                          <p className="text-xs text-muted-foreground">{p.client_email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {pLocale && (
                          <span className="text-xs" title={PROPOSAL_LOCALE_LABELS[pLocale as ProposalLocale] || pLocale}>
                            {PROPOSAL_LOCALE_FLAGS[pLocale as ProposalLocale] || "🌐"}
                          </span>
                        )}
                        {p.viewed_at && (
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" title="Visualizada" />
                        )}
                        {p.accepted_at && (
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" title="Aceita" />
                        )}
                        <Badge className={badge.className} variant="secondary">
                          {badge.label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valor total</span>
                      <span className="font-semibold">{formatCurrency(p.total_value, p.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Serviços</span>
                      <span>{p.services.length} item(ns)</span>
                    </div>
                    {p.proposal_type && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Tipo</span>
                        <span>{p.proposal_type === "monthly" ? "Mensal" : "Projeto"}</span>
                      </div>
                    )}
                    {p.plan && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Plano</span>
                        <span className="capitalize">{p.plan}</span>
                      </div>
                    )}
                    {p.pieces_quantity > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Peças</span>
                        <span>{p.pieces_quantity}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Criada em</span>
                      <span>{format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                    {p.status !== "accepted" && p.status !== "expired" && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Expira em {daysLeft} dia(s)</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {p.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => handleSend(p.id)}>
                          <Send className="h-3.5 w-3.5 mr-1.5" /> Enviar
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => copyLink(p.token)}>
                        <Copy className="h-3.5 w-3.5 mr-1.5" /> Link
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/proposta/${p.token}`)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Proposta" : "Nova Proposta Comercial"}</DialogTitle>
            <DialogDescription>Preencha os dados do cliente e serviços oferecidos.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template bar */}
            {templates.length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select onValueChange={(id) => {
                  const tpl = templates.find((t) => t.id === id);
                  if (tpl) loadTemplate(tpl);
                }}>
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue placeholder="Carregar template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome do Cliente *</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex: Empresa ABC" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="email@cliente.com" />
              </div>
            </div>

            {/* Language selector */}
            <div className="space-y-1.5">
              <Label>Idioma da proposta</Label>
              <Select value={locale} onValueChange={(v) => setLocale(v as ProposalLocale)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROPOSAL_LOCALE_LABELS) as ProposalLocale[]).map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {PROPOSAL_LOCALE_FLAGS[loc]} {PROPOSAL_LOCALE_LABELS[loc]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo + Plano + Peças */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Tipo de proposta</Label>
                <Select value={proposalType} onValueChange={setProposalType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="project">Projeto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="essencial">Essencial</SelectItem>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Qtd. de peças</Label>
                <Input
                  type="number"
                  min={0}
                  value={piecesQuantity || ""}
                  onChange={(e) => setPiecesQuantity(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Escopo do Projeto</Label>
              <RichTextEditor
                content={scopeDescription}
                onChange={setScopeDescription}
                placeholder="Descreva o escopo dos serviços... Use títulos, listas e negrito para organizar."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição do Investimento</Label>
              <RichTextEditor
                content={investmentDescription}
                onChange={setInvestmentDescription}
                placeholder="Condições de pagamento, observações..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Moeda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prazo de expiração (dias)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Services */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Serviços</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setServices([...services, { name: "", description: "", value: 0 }])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                </Button>
              </div>
              {services.map((svc, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Nome do serviço"
                      value={svc.name}
                      onChange={(e) => {
                        const copy = [...services];
                        copy[i] = { ...copy[i], name: e.target.value };
                        setServices(copy);
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Valor"
                      value={svc.value || ""}
                      onChange={(e) => {
                        const copy = [...services];
                        copy[i] = { ...copy[i], value: Number(e.target.value) };
                        setServices(copy);
                      }}
                      className="w-28"
                    />
                    {services.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive"
                        onClick={() => setServices(services.filter((_, j) => j !== i))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Descrição (opcional)"
                    value={svc.description}
                    onChange={(e) => {
                      const copy = [...services];
                      copy[i] = { ...copy[i], description: e.target.value };
                      setServices(copy);
                    }}
                  />
                </div>
              ))}
              <div className="flex justify-end text-sm font-semibold text-primary-foreground">
                Total: {formatCurrency(totalValue, currency)}
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCreate} disabled={saving}>
                {saving ? (editingId ? "Salvando..." : "Criando...") : (editingId ? "Salvar Alterações" : "Criar Proposta")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setTemplateDialogOpen(true)}
                title="Salvar como template"
              >
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar Template</DialogTitle>
            <DialogDescription>Salve o formulário atual como template reutilizável.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome do template *</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Pacote Social Media"
              />
            </div>

            {/* Existing templates for deletion */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Templates existentes</Label>
                {templates.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded border">
                    <span>{t.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleDeleteTemplate(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button className="w-full" onClick={handleSaveTemplate} disabled={savingTemplate}>
              {savingTemplate ? "Salvando..." : "Salvar Template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
