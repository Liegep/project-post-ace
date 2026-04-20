import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { BriefLocale } from "@/lib/briefTranslations";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Trash2, Eye, Edit2, Search,
  FileText, PenTool, Palette, Share2, Globe, Megaphone,
  Link2, Download, Copy, Check,
} from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import UserProfileMenu from "@/components/UserProfileMenu";
import { format } from "date-fns";
import { briefTemplates, getTemplate } from "@/lib/briefTemplates";
import BriefForm from "@/components/briefs/BriefForm";
import BriefDetailDialog from "@/components/briefs/BriefDetailDialog";
import { downloadBriefPdf } from "@/lib/briefPdf";
import TemplatesManager from "@/components/briefs/TemplatesManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LucideIcon } from "lucide-react";

interface DesignBrief {
  id: string;
  title: string;
  category: string;
  answers: Record<string, any>;
  status: string;
  locale: string;
  user_id: string;
  client_id: string | null;
  respondent_name: string;
  respondent_email: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ClientOption {
  id: string;
  name: string;
}

type View = "categories" | "list" | "form";

const categoryIcons: Record<string, LucideIcon> = {
  general: FileText,
  logo: PenTool,
  identity: Palette,
  social_media: Share2,
  website: Globe,
  campaign: Megaphone,
};

export default function DesignBriefsPage() {
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<DesignBrief[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<View>("categories");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [editingBrief, setEditingBrief] = useState<DesignBrief | null>(null);
  const [viewingBrief, setViewingBrief] = useState<DesignBrief | null>(null);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadBriefs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("design_briefs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setBriefs(data.map((d: any) => ({
        ...d,
        category: d.category || "general",
        answers: (typeof d.answers === "object" && d.answers) ? d.answers as Record<string, any> : {},
      })));
    }
    setLoading(false);
  }, []);

  const loadClients = useCallback(async () => {
    const { data } = await supabase.from("clients").select("id, name").order("name");
    if (data) setClients(data);
  }, []);

  useEffect(() => { loadBriefs(); loadClients(); }, [loadBriefs, loadClients]);

  const briefCounts = briefTemplates.reduce((acc, t) => {
    acc[t.id] = briefs.filter(b => b.category === t.id).length;
    return acc;
  }, {} as Record<string, number>);

  const openCategory = async (categoryId: string) => {
    const template = getTemplate(categoryId);
    if (!template) return;

    if (template.isBase) {
      const existing = briefs.find(b => b.category === "general");
      if (existing) {
        setEditingBrief(existing);
      } else {
        setEditingBrief(null);
      }
      setSelectedCategory(categoryId);
      setView("form");
    } else {
      setSelectedCategory(categoryId);
      setView("list");
    }
  };

  const handleSave = async (title: string, answers: Record<string, any>, locale: BriefLocale) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const clientId = selectedClientId && selectedClientId !== "none" ? selectedClientId : null;

    if (editingBrief) {
      const { error } = await supabase
        .from("design_briefs")
        .update({ title, answers: answers as any, locale, status: "completed", client_id: clientId })
        .eq("id", editingBrief.id);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Brief atualizado!" });
      }
    } else {
      const { error } = await supabase
        .from("design_briefs")
        .insert({
          title,
          answers: answers as any,
          category: selectedCategory,
          locale,
          user_id: user.id,
          status: Object.keys(answers).length > 0 ? "completed" : "draft",
          client_id: clientId,
        });
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Brief criado com sucesso!" });
      }
    }

    setSaving(false);
    await loadBriefs();
    const template = getTemplate(selectedCategory);
    if (template?.isBase) {
      setView("categories");
    } else {
      setView("list");
    }
    setEditingBrief(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("design_briefs").delete().eq("id", id);
    if (!error) {
      toast({ title: "Brief excluído" });
      loadBriefs();
    }
  };

  const handleShareLink = async (brief: DesignBrief) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("design_brief_tokens")
      .insert({ brief_id: brief.id, created_by: user.id })
      .select("token")
      .single();

    if (error || !data) {
      toast({ title: "Erro ao gerar link", description: error?.message, variant: "destructive" });
      return;
    }

    const url = `${window.location.origin}/brief/${data.token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(brief.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Link copiado!", description: "Link válido por 7 dias." });
  };

  const handleExportPdf = (brief: DesignBrief) => {
    downloadBriefPdf(brief);
  };

  const goBack = () => {
    if (view === "form") {
      const template = getTemplate(selectedCategory);
      setView(template?.isBase ? "categories" : "list");
      setEditingBrief(null);
    } else if (view === "list") {
      setView("categories");
      setSelectedCategory("");
      setSearch("");
    }
  };

  const currentTemplate = getTemplate(selectedCategory);
  const filteredBriefs = briefs
    .filter(b => b.category === selectedCategory)
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()));

  const viewTitle = view === "categories"
    ? "Briefs de Design"
    : view === "list"
      ? currentTemplate?.name || "Briefs"
      : editingBrief ? "Editar Brief" : `Novo ${currentTemplate?.name || "Brief"}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass-header px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-3">
          <MobileNav title="Briefs de Design" />
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => view === "categories" ? navigate("/") : goBack()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">{viewTitle}</h1>
        </div>
        <UserProfileMenu />
      </header>

      <div className="p-4 md:p-8">
        {/* ─── Categories Grid ─── */}
        {view === "categories" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] flex items-center justify-center shadow-lg">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">Briefs de Design</h2>
                <p className="text-sm text-muted-foreground">Selecione a categoria de briefing</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {briefTemplates.map(t => {
                const Icon = categoryIcons[t.id] || FileText;
                const count = briefCounts[t.id] || 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => openCategory(t.id)}
                    className="group relative text-left rounded-2xl border border-white/20 bg-white/55 dark:bg-white/5 backdrop-blur-xl shadow-md hover:shadow-xl hover:border-[hsl(var(--gradient-mid))/0.4] transition-all duration-300 p-6 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      {count > 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          {count} {count === 1 ? "brief" : "briefs"}
                        </Badge>
                      )}
                      {t.isBase && count > 0 && (
                        <Badge className="text-[10px] bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                          Preenchido
                        </Badge>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{t.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                    </div>
                    {t.isBase && (
                      <span className="text-[10px] text-primary/70 font-medium">Base do cliente • Preencha uma vez</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── List View ─── */}
        {view === "list" && currentTemplate && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <button onClick={goBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <Button
                onClick={() => { setEditingBrief(null); setView("form"); }}
                className="bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))] text-white hover:opacity-90 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" /> Novo {currentTemplate.name}
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar briefs..."
                className="pl-10 bg-white/50 dark:bg-white/5 border-white/30 backdrop-blur-sm"
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-40 rounded-2xl bg-white/30 dark:bg-white/5 animate-pulse border border-white/20" />
                ))}
              </div>
            ) : filteredBriefs.length === 0 ? (
              <div className="rounded-2xl border border-white/20 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">
                  {search ? "Nenhum brief encontrado." : `Nenhum ${currentTemplate.name} criado ainda.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredBriefs.map(b => (
                  <div
                    key={b.id}
                    className="group relative rounded-2xl border border-white/20 bg-white/55 dark:bg-white/5 backdrop-blur-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-foreground line-clamp-2">{b.title}</h3>
                      {b.submitted_at ? (
                        <Badge className="text-[10px] bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 shrink-0">
                          Respondido
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          Aguardando
                        </Badge>
                      )}
                    </div>

                    {b.submitted_at && b.respondent_name && (
                      <p className="text-xs text-muted-foreground mb-1">
                        <span className="font-medium">Respondido por:</span> {b.respondent_name}
                        {b.respondent_email && ` (${b.respondent_email})`}
                      </p>
                    )}
                    {b.client_id && (
                      <p className="text-xs text-muted-foreground mb-1">
                        <span className="font-medium">Cliente:</span> {clients.find(c => c.id === b.client_id)?.name || "—"}
                      </p>
                    )}
                    {b.submitted_at && b.answers?.company_name && (
                      <p className="text-xs text-muted-foreground mb-1">
                        <span className="font-medium">Empresa:</span> {b.answers.company_name}
                      </p>
                    )}

                    <div className="mt-auto pt-3 border-t border-white/15 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(b.created_at), "dd/MM/yyyy")}
                      </span>
                      <div className="flex gap-1">
                        <button onClick={() => handleShareLink(b)} className="p-1.5 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors" title="Gerar link para preenchimento">
                          {copiedId === b.id ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
                        </button>
                        {b.submitted_at && (
                          <>
                            <button onClick={() => handleExportPdf(b)} className="p-1.5 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors" title="Exportar PDF">
                              <Download className="h-4 w-4" />
                            </button>
                            <button onClick={() => setViewingBrief(b)} className="p-1.5 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors" title="Ver respostas">
                              <Eye className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => { setEditingBrief(b); setSelectedClientId(b.client_id || ""); setView("form"); }} className="p-1.5 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors" title="Editar">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Form View ─── */}
        {view === "form" && currentTemplate && (
          <div className="max-w-2xl mx-auto">
            <button onClick={goBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>

            <div className="rounded-2xl border border-white/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] flex items-center justify-center">
                  {(() => { const Icon = categoryIcons[selectedCategory] || FileText; return <Icon className="h-5 w-5 text-white" />; })()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {editingBrief ? "Editar" : "Novo"} {currentTemplate.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">{currentTemplate.description}</p>
                </div>
              </div>

              {/* Client selector */}
              {clients.length > 0 && (
                <div className="space-y-1.5 mb-6">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Vincular a um cliente (opcional)
                  </Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="bg-white/50 dark:bg-white/5 border-white/30 backdrop-blur-sm">
                      <SelectValue placeholder="Nenhum cliente selecionado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <BriefForm
                template={currentTemplate}
                initialAnswers={editingBrief?.answers || {}}
                initialTitle={editingBrief?.title || ""}
                initialLocale={(editingBrief?.locale as BriefLocale) || "pt"}
                saving={saving}
                onSave={handleSave}
              />
            </div>
          </div>
        )}
      </div>

      <BriefDetailDialog
        brief={viewingBrief}
        open={!!viewingBrief}
        onClose={() => setViewingBrief(null)}
      />
    </div>
  );
}
