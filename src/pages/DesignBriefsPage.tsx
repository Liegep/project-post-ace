import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Palette, Plus, ArrowLeft, Trash2, Eye, Edit2, Save, Search } from "lucide-react";
import { MobileNav } from "@/components/MobileNav";
import UserProfileMenu from "@/components/UserProfileMenu";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DesignBrief {
  id: string;
  title: string;
  brand_name: string;
  target_audience: string;
  preferred_colors: string;
  style_preferences: string;
  references_links: string;
  objectives: string;
  additional_notes: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const emptyBrief = {
  title: "",
  brand_name: "",
  target_audience: "",
  preferred_colors: "",
  style_preferences: "",
  references_links: "",
  objectives: "",
  additional_notes: "",
};

type View = "list" | "create" | "edit";

export default function DesignBriefsPage() {
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<DesignBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<View>("list");
  const [form, setForm] = useState(emptyBrief);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewBrief, setViewBrief] = useState<DesignBrief | null>(null);

  useEffect(() => {
    loadBriefs();
  }, []);

  const loadBriefs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("design_briefs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setBriefs((data as any) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    if (editId) {
      const { error } = await supabase
        .from("design_briefs")
        .update({ ...form, status: "completed" })
        .eq("id", editId);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Brief atualizado!" });
      }
    } else {
      const { error } = await supabase
        .from("design_briefs")
        .insert({ ...form, user_id: user.id, status: "completed" });
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Brief de design criado!" });
      }
    }
    setSaving(false);
    setView("list");
    setForm(emptyBrief);
    setEditId(null);
    loadBriefs();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("design_briefs").delete().eq("id", id);
    if (!error) {
      toast({ title: "Brief excluído" });
      loadBriefs();
    }
  };

  const openEdit = (b: DesignBrief) => {
    setForm({
      title: b.title,
      brand_name: b.brand_name,
      target_audience: b.target_audience,
      preferred_colors: b.preferred_colors,
      style_preferences: b.style_preferences,
      references_links: b.references_links,
      objectives: b.objectives,
      additional_notes: b.additional_notes,
    });
    setEditId(b.id);
    setView("edit");
  };

  const filtered = briefs.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.brand_name.toLowerCase().includes(search.toLowerCase())
  );

  const fields: { key: keyof typeof emptyBrief; label: string; multiline?: boolean }[] = [
    { key: "title", label: "Título do Brief *" },
    { key: "brand_name", label: "Nome da Marca / Projeto" },
    { key: "objectives", label: "Objetivos do Design", multiline: true },
    { key: "target_audience", label: "Público-Alvo", multiline: true },
    { key: "preferred_colors", label: "Cores Preferidas / Paleta" },
    { key: "style_preferences", label: "Preferências de Estilo (moderno, minimalista, ousado...)", multiline: true },
    { key: "references_links", label: "Referências / Links de Inspiração", multiline: true },
    { key: "additional_notes", label: "Observações Adicionais", multiline: true },
  ];

  // ─── Form view ───
  if (view === "create" || view === "edit") {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-30 glass-header px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <MobileNav title="Briefs de Design" />
            <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-foreground">{view === "edit" ? "Editar Brief" : "Novo Brief"}</h1>
          </div>
          <UserProfileMenu />
        </header>
        <div className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => { setView("list"); setForm(emptyBrief); setEditId(null); }}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>

          <div className="rounded-2xl border border-white/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl shadow-xl p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] flex items-center justify-center">
                <Palette className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                {view === "edit" ? "Editar Brief" : "Novo Brief de Design"}
              </h1>
            </div>

            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {f.label}
                </Label>
                {f.multiline ? (
                  <Textarea
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    rows={3}
                    className="bg-white/50 dark:bg-white/5 border-white/30 backdrop-blur-sm"
                  />
                ) : (
                  <Input
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="bg-white/50 dark:bg-white/5 border-white/30 backdrop-blur-sm"
                  />
                )}
              </div>
            ))}

            <Button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="w-full bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))] text-white hover:opacity-90"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : view === "edit" ? "Salvar Alterações" : "Criar Brief"}
            </Button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // ─── Detail dialog ───
  const detailFields = fields.filter((f) => f.key !== "title");

  // ─── List view ───
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 glass-header px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 md:gap-3">
          <MobileNav title="Briefs de Design" />
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Briefs de Design</h1>
        </div>
        <UserProfileMenu />
      </header>
      <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] flex items-center justify-center shadow-lg">
              <Palette className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Briefs de Design</h1>
              <p className="text-sm text-muted-foreground">Crie e consulte seus questionários de design</p>
            </div>
          </div>
          <Button
            onClick={() => setView("create")}
            className="bg-gradient-to-r from-[hsl(var(--gradient-start))] via-[hsl(var(--gradient-mid))] to-[hsl(var(--gradient-end))] text-white hover:opacity-90 shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" /> Novo Brief
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou marca..."
            className="pl-10 bg-white/50 dark:bg-white/5 border-white/30 backdrop-blur-sm"
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-white/30 dark:bg-white/5 animate-pulse border border-white/20" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/20 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-12 text-center">
            <Palette className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">
              {search ? "Nenhum brief encontrado." : "Nenhum brief criado ainda. Clique em \"Novo Brief\" para começar."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="group relative rounded-2xl border border-white/20 bg-white/55 dark:bg-white/5 backdrop-blur-xl shadow-md hover:shadow-xl hover:border-[hsl(var(--gradient-mid))/0.4] transition-all duration-300 p-5 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-foreground line-clamp-2 pr-2">{b.title}</h3>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {b.status === "completed" ? "Completo" : "Rascunho"}
                  </Badge>
                </div>

                {b.brand_name && (
                  <p className="text-xs text-muted-foreground mb-1">
                    <span className="font-medium">Marca:</span> {b.brand_name}
                  </p>
                )}
                {b.objectives && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{b.objectives}</p>
                )}

                <div className="mt-auto pt-3 border-t border-white/15 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {format(new Date(b.created_at), "dd/MM/yyyy")}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setViewBrief(b)}
                      className="p-1.5 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEdit(b)}
                      className="p-1.5 rounded-lg hover:bg-white/40 dark:hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewBrief} onOpenChange={() => setViewBrief(null)}>
        <DialogContent className="max-w-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-white/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              {viewBrief?.title}
            </DialogTitle>
          </DialogHeader>
          {viewBrief && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {viewBrief.brand_name && (
                <Section label="Marca / Projeto" value={viewBrief.brand_name} />
              )}
              {viewBrief.objectives && (
                <Section label="Objetivos" value={viewBrief.objectives} />
              )}
              {viewBrief.target_audience && (
                <Section label="Público-Alvo" value={viewBrief.target_audience} />
              )}
              {viewBrief.preferred_colors && (
                <Section label="Cores Preferidas" value={viewBrief.preferred_colors} />
              )}
              {viewBrief.style_preferences && (
                <Section label="Preferências de Estilo" value={viewBrief.style_preferences} />
              )}
              {viewBrief.references_links && (
                <Section label="Referências / Links" value={viewBrief.references_links} />
              )}
              {viewBrief.additional_notes && (
                <Section label="Observações" value={viewBrief.additional_notes} />
              )}
              <p className="text-[10px] text-muted-foreground pt-2">
                Criado em {format(new Date(viewBrief.created_at), "dd/MM/yyyy 'às' HH:mm")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/40 dark:bg-white/5 border border-white/15 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}
