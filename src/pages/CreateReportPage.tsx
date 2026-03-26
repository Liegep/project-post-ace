import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  useCreateReport, useSocialReportTemplates, useSaveTemplate,
  METRIC_LABELS, DEFAULT_METRIC_FIELDS, SocialReportMetrics
} from "@/hooks/useSocialReports";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { MobileNav } from "@/components/MobileNav";
import UserProfileMenu from "@/components/UserProfileMenu";
import {
  ArrowLeft, Save, BookTemplate, Instagram, Facebook,
  TrendingUp, TrendingDown, Minus, MessageSquareText
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";

interface Client { id: string; name: string; slug: string; logo_url: string; }

export default function CreateReportPage() {
  const navigate = useNavigate();
  const createReport = useCreateReport();
  const saveTemplate = useSaveTemplate();
  const { data: templates = [] } = useSocialReportTemplates();
  const { userId } = useUserRole();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [strategicComment, setStrategicComment] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [bestContent, setBestContent] = useState("");
  const [worstContent, setWorstContent] = useState("");
  const [bestFormat, setBestFormat] = useState("");
  const [observations, setObservations] = useState("");
  const [activeFields, setActiveFields] = useState<string[]>(DEFAULT_METRIC_FIELDS);
  const [metrics, setMetrics] = useState<SocialReportMetrics>({});
  const [prevMetrics, setPrevMetrics] = useState<SocialReportMetrics>({});
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showTemplateSave, setShowTemplateSave] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!userId) return;
      const { data: assignments } = await supabase.from("user_client_assignments").select("client_id").eq("user_id", userId);
      const ids = (assignments || []).map((a: any) => a.client_id);
      const { data: owned } = await supabase.from("clients").select("id").eq("owner_id", userId);
      const allIds = [...new Set([...ids, ...(owned || []).map((c: any) => c.id)])];
      if (allIds.length > 0) {
        const { data } = await supabase.from("clients").select("id, name, slug, logo_url").in("id", allIds).order("name");
        setClients((data as Client[]) || []);
      }
    };
    fetch();
  }, [userId]);

  const toggleField = (field: string) => {
    setActiveFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const applyTemplate = (templateId: string) => {
    const t = templates.find(t => t.id === templateId);
    if (t) {
      setActiveFields(t.metric_fields as string[]);
      toast({ title: `Modelo "${t.name}" aplicado` });
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    try {
      await saveTemplate.mutateAsync({ name: templateName, created_by: userId, metric_fields: activeFields });
      toast({ title: "Modelo salvo!" });
      setShowTemplateSave(false);
      setTemplateName("");
    } catch {
      toast({ title: "Erro ao salvar modelo", variant: "destructive" });
    }
  };

  const handleSubmit = async (status: string) => {
    if (!clientId || !periodStart || !periodEnd) {
      toast({ title: "Preencha cliente e período", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const client = clients.find(c => c.id === clientId);
      const report = await createReport.mutateAsync({
        client_id: clientId,
        created_by: userId,
        title: title || `Relatório ${client?.name || ""} - ${platform}`,
        period_start: periodStart,
        period_end: periodEnd,
        platform,
        strategic_comment: strategicComment,
        recommendations,
        metrics: metrics as any,
        previous_metrics: prevMetrics as any,
        best_content: bestContent,
        worst_content: worstContent,
        best_format: bestFormat,
        observations,
        status,
      });


      toast({ title: status === "published" ? "Relatório publicado!" : "Rascunho salvo!" });
      navigate(`/reports/${report.id}`);
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass-header">
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <MobileNav title="Novo Relatório" />
            <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Novo Relatório</h1>
          </div>
          <div className="flex items-center gap-2">
            <UserProfileMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 md:px-6 space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Informações básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente *</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          {c.logo_url && <img src={c.logo_url} className="h-4 w-4 rounded-full" alt="" />}
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Plataforma</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram"><span className="flex items-center gap-2"><Instagram className="h-3.5 w-3.5" />Instagram</span></SelectItem>
                    <SelectItem value="facebook"><span className="flex items-center gap-2"><Facebook className="h-3.5 w-3.5" />Facebook</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Título do relatório</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Relatório Mensal Janeiro 2026" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Período início *</Label>
                <Input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Período fim *</Label>
                <Input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strategic Comment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-primary" />
              Comentário Estratégico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={strategicComment}
              onChange={e => setStrategicComment(e.target.value)}
              placeholder="Resumo estratégico da conta: análise geral, pontos de destaque, tendências observadas..."
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>

        {/* Metric Fields Selection */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Métricas a exibir</CardTitle>
              <div className="flex gap-2">
                {templates.length > 0 && (
                  <Select onValueChange={applyTemplate}>
                    <SelectTrigger className="h-8 w-[160px] text-xs">
                      <SelectValue placeholder="Usar modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => setShowTemplateSave(!showTemplateSave)}>
                  <BookTemplate className="h-3 w-3" /> Salvar modelo
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showTemplateSave && (
              <div className="flex gap-2 pb-2">
                <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Nome do modelo" className="h-8 text-xs" />
                <Button size="sm" className="h-8 text-xs" onClick={handleSaveTemplate}>Salvar</Button>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(METRIC_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={activeFields.includes(key)}
                    onCheckedChange={() => toggleField(key)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metrics Input */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Métricas do Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeFields.map(field => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs">{METRIC_LABELS[field] || field}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Atual</span>
                      <Input
                        type="number"
                        value={metrics[field] ?? ""}
                        onChange={e => setMetrics(prev => ({ ...prev, [field]: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="0"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Anterior</span>
                      <Input
                        type="number"
                        value={prevMetrics[field] ?? ""}
                        onChange={e => setPrevMetrics(prev => ({ ...prev, [field]: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="0"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Analysis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Análise de Conteúdo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Melhor conteúdo</Label>
              <Input value={bestContent} onChange={e => setBestContent(e.target.value)} placeholder="Qual post teve melhor performance?" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pior conteúdo</Label>
              <Input value={worstContent} onChange={e => setWorstContent(e.target.value)} placeholder="Qual post teve pior performance?" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Formato com melhor performance</Label>
              <Input value={bestFormat} onChange={e => setBestFormat(e.target.value)} placeholder="Ex: Reels, Carrossel, Imagem estática..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observações adicionais</Label>
              <Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Notas, insights extras..." className="min-h-[80px]" />
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recomendações e Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={recommendations}
              onChange={e => setRecommendations(e.target.value)}
              placeholder="Sugestões de melhoria, próximos passos, foco estratégico para o próximo período..."
              className="min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => handleSubmit("draft")}
            disabled={saving}
          >
            <Save className="h-4 w-4" /> Salvar Rascunho
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => handleSubmit("published")}
            disabled={saving}
          >
            Publicar Relatório
          </Button>
        </div>
      </main>
    </div>
  );
}
