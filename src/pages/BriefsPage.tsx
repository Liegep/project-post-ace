import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import UserProfileMenu from "@/components/UserProfileMenu";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/i18n/I18nContext";
import {
  ArrowLeft, Plus, CalendarIcon, Copy, Eye, EyeOff, Send, Check, X,
  Filter, Search, Pencil, MessageCircle, Paperclip, FileText
} from "lucide-react";

type BriefStatus = "draft" | "internal" | "pending_approval" | "approved" | "rejected" | "published";

interface Brief {
  id: string;
  client_id: string;
  title: string;
  description: string;
  caption: string;
  planned_date: string | null;
  content_type: string;
  status: BriefStatus;
  assigned_to: string | null;
  internal_notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string; slug: string; logo_url: string };
  comment_count?: number;
}

interface BriefComment {
  id: string;
  brief_id: string;
  user_id: string;
  author_name: string;
  author_role: string;
  message: string;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

const STATUS_CONFIG: Record<BriefStatus, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  internal: { label: "Interno", color: "bg-blue-500/15 text-blue-600" },
  pending_approval: { label: "Aguardando Aprovação", color: "bg-amber-500/15 text-amber-600" },
  approved: { label: "Aprovado", color: "bg-emerald-500/15 text-emerald-600" },
  rejected: { label: "Reprovado", color: "bg-red-500/15 text-red-600" },
  published: { label: "Publicado", color: "bg-purple-500/15 text-purple-600" },
};

const CONTENT_TYPES = [
  { value: "post", label: "Post" },
  { value: "reels", label: "Reels" },
  { value: "story", label: "Story" },
  { value: "carousel", label: "Carrossel" },
  { value: "article", label: "Artigo" },
  { value: "video", label: "Vídeo" },
  { value: "other", label: "Outro" },
];

const BriefsPage = () => {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterClient, setFilterClient] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterAssigned, setFilterAssigned] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrief, setEditingBrief] = useState<Brief | null>(null);
  const [detailBrief, setDetailBrief] = useState<Brief | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [comments, setComments] = useState<BriefComment[]>([]);
  const [newComment, setNewComment] = useState("");

  // Form state
  const [formClientId, setFormClientId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCaption, setFormCaption] = useState("");
  const [formPlannedDate, setFormPlannedDate] = useState<Date | undefined>();
  const [formContentType, setFormContentType] = useState("post");
  const [formStatus, setFormStatus] = useState<BriefStatus>("draft");
  const [formAssignedTo, setFormAssignedTo] = useState("");
  const [formInternalNotes, setFormInternalNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [briefsRes, clientsRes, membersRes] = await Promise.all([
      supabase.from("content_briefs").select("*, clients(name, slug, logo_url)").order("updated_at", { ascending: false }),
      supabase.from("clients").select("id, name, slug, logo_url").order("name"),
      supabase.from("profiles").select("id, full_name, email"),
    ]);

    if (briefsRes.data) {
      // Count comments per brief
      const briefIds = briefsRes.data.map((b: any) => b.id);
      let commentCounts: Record<string, number> = {};
      if (briefIds.length > 0) {
        const { data: commentsData } = await supabase
          .from("brief_comments")
          .select("brief_id")
          .in("brief_id", briefIds);
        if (commentsData) {
          commentsData.forEach((c: any) => {
            commentCounts[c.brief_id] = (commentCounts[c.brief_id] || 0) + 1;
          });
        }
      }
      setBriefs(briefsRes.data.map((b: any) => ({ ...b, comment_count: commentCounts[b.id] || 0 })));
    }
    if (clientsRes.data) setClients(clientsRes.data);
    if (membersRes.data) setTeamMembers(membersRes.data);
    setLoading(false);
  };

  const resetForm = () => {
    setFormClientId("");
    setFormTitle("");
    setFormDescription("");
    setFormCaption("");
    setFormPlannedDate(undefined);
    setFormContentType("post");
    setFormStatus("draft");
    setFormAssignedTo("");
    setFormInternalNotes("");
    setEditingBrief(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (brief: Brief) => {
    setEditingBrief(brief);
    setFormClientId(brief.client_id);
    setFormTitle(brief.title);
    setFormDescription(brief.description);
    setFormCaption(brief.caption);
    setFormPlannedDate(brief.planned_date ? new Date(brief.planned_date) : undefined);
    setFormContentType(brief.content_type);
    setFormStatus(brief.status);
    setFormAssignedTo(brief.assigned_to || "");
    setFormInternalNotes(brief.internal_notes);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formClientId || !formTitle.trim()) {
      toast({ title: "Preencha cliente e título", variant: "destructive" });
      return;
    }

    const payload: any = {
      client_id: formClientId,
      title: formTitle.trim(),
      description: formDescription,
      caption: formCaption,
      planned_date: formPlannedDate ? format(formPlannedDate, "yyyy-MM-dd") : null,
      content_type: formContentType,
      status: formStatus,
      assigned_to: formAssignedTo || null,
      internal_notes: formInternalNotes,
    };

    let error;
    if (editingBrief) {
      ({ error } = await supabase.from("content_briefs").update(payload).eq("id", editingBrief.id));
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id;
      ({ error } = await supabase.from("content_briefs").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar pauta", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingBrief ? "Pauta atualizada" : "Pauta criada" });
      setDialogOpen(false);
      resetForm();
      loadData();
    }
  };

  const duplicateBrief = async (brief: Brief) => {
    const { data: { user } } = await supabase.auth.getUser();
    const dupPayload: any = {
      client_id: brief.client_id,
      title: `${brief.title} (cópia)`,
      description: brief.description,
      caption: brief.caption,
      planned_date: brief.planned_date,
      content_type: brief.content_type,
      status: "draft",
      assigned_to: brief.assigned_to,
      internal_notes: brief.internal_notes,
      created_by: user?.id,
    };
    const { error } = await supabase.from("content_briefs").insert(dupPayload);
    if (!error) {
      toast({ title: "Pauta duplicada" });
      loadData();
    }
  };

  const toggleClientVisibility = async (brief: Brief) => {
    const newStatus: BriefStatus = brief.status === "pending_approval" ? "internal" : "pending_approval";
    const { error } = await supabase.from("content_briefs").update({ status: newStatus } as any).eq("id", brief.id);
    if (!error) {
      toast({ title: newStatus === "pending_approval" ? "Enviado para aprovação do cliente" : "Removido da visão do cliente" });
      loadData();
    }
  };

  const updateStatus = async (briefId: string, newStatus: BriefStatus) => {
    const { error } = await supabase.from("content_briefs").update({ status: newStatus } as any).eq("id", briefId);
    if (!error) {
      toast({ title: `Status atualizado para ${STATUS_CONFIG[newStatus].label}` });
      loadData();
      if (detailBrief?.id === briefId) {
        setDetailBrief((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    }
  };

  const openDetail = async (brief: Brief) => {
    setDetailBrief(brief);
    setDetailOpen(true);
    const { data } = await supabase
      .from("brief_comments")
      .select("*")
      .eq("brief_id", brief.id)
      .order("created_at", { ascending: true });
    if (data) setComments(data as BriefComment[]);
  };

  const addComment = async () => {
    if (!newComment.trim() || !detailBrief) return;
    const { data: { user } } = await supabase.auth.getUser();
    const profile = teamMembers.find((m) => m.id === user?.id);
    const { error } = await supabase.from("brief_comments").insert({
      brief_id: detailBrief.id,
      user_id: user?.id || "",
      author_name: profile?.full_name || user?.email || "Admin",
      author_role: "admin",
      message: newComment.trim(),
    });
    if (!error) {
      setNewComment("");
      const { data } = await supabase.from("brief_comments").select("*").eq("brief_id", detailBrief.id).order("created_at", { ascending: true });
      if (data) setComments(data as BriefComment[]);
    }
  };

  // Filtering
  const filtered = briefs.filter((b) => {
    if (filterClient !== "all" && b.client_id !== filterClient) return false;
    if (filterStatus !== "all" && b.status !== filterStatus) return false;
    if (filterType !== "all" && b.content_type !== filterType) return false;
    if (filterAssigned !== "all" && (b.assigned_to || "") !== filterAssigned) return false;
    if (searchQuery && !b.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Sort: pending first, then by updated_at
  const sorted = [...filtered].sort((a, b) => {
    const order: Record<BriefStatus, number> = { pending_approval: 0, draft: 1, internal: 2, rejected: 3, approved: 4, published: 5 };
    const diff = order[a.status] - order[b.status];
    if (diff !== 0) return diff;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const getAssignedName = (id: string | null) => {
    if (!id) return "—";
    const m = teamMembers.find((m) => m.id === id);
    return m?.full_name || m?.email || "—";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Pautas</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSelector />
            <UserProfileMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 space-y-4">
        {/* Actions + search */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova Pauta
          </Button>
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pautas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[170px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {CONTENT_TYPES.map((ct) => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterAssigned} onValueChange={setFilterAssigned}>
            <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Brief cards */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma pauta encontrada</p>
            <Button variant="outline" className="mt-3" onClick={openCreate}>Criar primeira pauta</Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((brief) => {
              const sc = STATUS_CONFIG[brief.status];
              const ct = CONTENT_TYPES.find((c) => c.value === brief.content_type);
              return (
                <div
                  key={brief.id}
                  className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-2"
                  onClick={() => openDetail(brief)}
                >
                  {/* Client + status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {brief.clients?.logo_url ? (
                        <img src={brief.clients.logo_url} className="h-6 w-6 rounded-full object-contain border shrink-0" />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold">{brief.clients?.name?.charAt(0)}</span>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground truncate">{brief.clients?.name}</span>
                    </div>
                    <Badge variant="secondary" className={cn("text-[10px] shrink-0", sc.color)}>{sc.label}</Badge>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{brief.title}</h3>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {ct && <span className="rounded bg-muted px-1.5 py-0.5">{ct.label}</span>}
                    {brief.planned_date && (
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {new Date(brief.planned_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    {brief.assigned_to && <span>👤 {getAssignedName(brief.assigned_to)}</span>}
                    {(brief.comment_count || 0) > 0 && (
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="h-3 w-3" /> {brief.comment_count}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 mt-auto pt-2 border-t">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); openEdit(brief); }}>
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={(e) => { e.stopPropagation(); duplicateBrief(brief); }}>
                      <Copy className="h-3 w-3" /> Duplicar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-7 text-xs gap-1 ml-auto", brief.status === "pending_approval" ? "text-amber-600" : "text-muted-foreground")}
                      onClick={(e) => { e.stopPropagation(); toggleClientVisibility(brief); }}
                    >
                      {brief.status === "pending_approval" ? <><EyeOff className="h-3 w-3" /> Ocultar</> : <><Send className="h-3 w-3" /> Enviar</>}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); setDialogOpen(v); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBrief ? "Editar Pauta" : "Nova Pauta"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select value={formClientId} onValueChange={setFormClientId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de Conteúdo</Label>
                <Select value={formContentType} onValueChange={setFormContentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((ct) => <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Título da pauta" />
            </div>

            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Descreva o conteúdo..." rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label>Legenda</Label>
              <Textarea value={formCaption} onChange={(e) => setFormCaption(e.target.value)} placeholder="Legenda do post..." rows={3} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data Prevista</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formPlannedDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formPlannedDate ? format(formPlannedDate, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={formPlannedDate} onSelect={setFormPlannedDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select value={formAssignedTo} onValueChange={setFormAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={(v) => setFormStatus(v as BriefStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Observações Internas</Label>
              <Textarea value={formInternalNotes} onChange={(e) => setFormInternalNotes(e.target.value)} placeholder="Notas visíveis apenas para a equipe..." rows={2} />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSave}>{editingBrief ? "Salvar" : "Criar Pauta"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailBrief && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {detailBrief.clients?.logo_url && (
                    <img src={detailBrief.clients.logo_url} className="h-7 w-7 rounded-full object-contain border" />
                  )}
                  <span className="text-sm text-muted-foreground">{detailBrief.clients?.name}</span>
                  <Badge variant="secondary" className={cn("ml-auto text-xs", STATUS_CONFIG[detailBrief.status].color)}>
                    {STATUS_CONFIG[detailBrief.status].label}
                  </Badge>
                </div>
                <DialogTitle className="text-xl">{detailBrief.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Meta info */}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {CONTENT_TYPES.find((c) => c.value === detailBrief.content_type) && (
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {CONTENT_TYPES.find((c) => c.value === detailBrief.content_type)?.label}
                    </span>
                  )}
                  {detailBrief.planned_date && (
                    <span className="flex items-center gap-1 text-xs">
                      <CalendarIcon className="h-3 w-3" />
                      {new Date(detailBrief.planned_date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  {detailBrief.assigned_to && (
                    <span className="text-xs">👤 {getAssignedName(detailBrief.assigned_to)}</span>
                  )}
                </div>

                {detailBrief.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{detailBrief.description}</p>
                  </div>
                )}

                {detailBrief.caption && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Legenda</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 rounded-lg p-3">{detailBrief.caption}</p>
                  </div>
                )}

                {detailBrief.internal_notes && (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-500/5 p-3">
                    <Label className="text-xs text-amber-600 flex items-center gap-1">
                      <EyeOff className="h-3 w-3" /> Observações Internas
                    </Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{detailBrief.internal_notes}</p>
                  </div>
                )}

                {/* Status actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => updateStatus(detailBrief.id, "draft")}>Rascunho</Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => updateStatus(detailBrief.id, "internal")}>Interno</Button>
                  <Button size="sm" className="gap-1 text-xs bg-amber-500 hover:bg-amber-600" onClick={() => updateStatus(detailBrief.id, "pending_approval")}>
                    <Send className="h-3 w-3" /> Enviar para Aprovação
                  </Button>
                  <Button size="sm" className="gap-1 text-xs bg-emerald-500 hover:bg-emerald-600" onClick={() => updateStatus(detailBrief.id, "approved")}>
                    <Check className="h-3 w-3" /> Aprovar
                  </Button>
                  <Button size="sm" className="gap-1 text-xs bg-purple-500 hover:bg-purple-600" onClick={() => updateStatus(detailBrief.id, "published")}>
                    Publicado
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { openEdit(detailBrief); setDetailOpen(false); }}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                </div>

                {/* Comments */}
                <div className="space-y-3 pt-2 border-t">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" /> Comentários ({comments.length})
                  </h4>
                  {comments.length === 0 && <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comments.map((c) => (
                      <div key={c.id} className={cn("rounded-lg p-2.5 text-sm", c.author_role === "client" ? "bg-blue-500/10 border border-blue-500/20" : "bg-muted/50")}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs">{c.author_name}</span>
                          <Badge variant="secondary" className="text-[9px] h-4">
                            {c.author_role === "client" ? "Cliente" : "Equipe"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(c.created_at).toLocaleDateString("pt-BR")} {new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{c.message}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Escrever comentário..." rows={2} className="flex-1" />
                    <Button size="sm" onClick={addComment} disabled={!newComment.trim()} className="self-end">Enviar</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BriefsPage;
