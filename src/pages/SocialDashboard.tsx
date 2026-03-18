import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useSocialPosts, type SocialPost, type SocialPostStatus } from "@/hooks/useSocialPosts";
import { SocialPostCard } from "@/components/social/SocialPostCard";
import { SocialPostDialog } from "@/components/social/SocialPostDialog";
import { SocialCalendar, type ScheduledKanbanPost } from "@/components/social/SocialCalendar";
import { MetaConnectPanel } from "@/components/social/MetaConnectPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, CalendarDays, List, ArrowLeft, Facebook, Instagram, Settings, FileText, CheckCircle, Clock, Send, AlertTriangle, LogOut } from "lucide-react";
import { useEffect } from "react";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
}

const STATUS_FILTERS: { value: string; label: string; icon: React.ComponentType<any> }[] = [
  { value: "all", label: "Todos", icon: List },
  { value: "draft", label: "Rascunhos", icon: FileText },
  { value: "pending_approval", label: "Aguardando", icon: Clock },
  { value: "approved", label: "Aprovados", icon: CheckCircle },
  { value: "scheduled", label: "Agendados", icon: Clock },
  { value: "published", label: "Publicados", icon: Send },
  { value: "error", label: "Com Erro", icon: AlertTriangle },
];

export default function SocialDashboard() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);

  const { posts, pages, loading, createPost, updatePost, deletePost, duplicatePost, publishPost, cancelPost, approvePost, fetchPages } = useSocialPosts(selectedClientId || null);

  const [scheduledKanbanPosts, setScheduledKanbanPosts] = useState<ScheduledKanbanPost[]>([]);

  useEffect(() => {
    supabase.from("clients").select("id, name, slug, logo_url").order("name").then(({ data }) => {
      const clientList = (data || []) as Client[];
      setClients(clientList);
      if (clientList.length > 0 && !selectedClientId) {
        setSelectedClientId(clientList[0].id);
      }
    });
  }, []);

  // Fetch kanban posts with "agendado" status that have a deadline
  useEffect(() => {
    async function fetchScheduledKanban() {
      const { data } = await supabase
        .from("posts")
        .select("id, title, deadline, client_id, clients(name)")
        .contains("status", ["agendado"])
        .not("deadline", "is", null) as any;
      
      if (data) {
        const mapped: ScheduledKanbanPost[] = data.map((p: any) => ({
          id: p.id,
          title: p.title,
          client_name: p.clients?.name || "—",
          deadline: p.deadline,
        }));
        setScheduledKanbanPosts(mapped);
      }
    }
    fetchScheduledKanban();
  }, []);

  const filteredPosts = useMemo(() => {
    let filtered = posts;
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    if (platformFilter !== "all") {
      filtered = filtered.filter((p) => p.platform === platformFilter);
    }
    return filtered;
  }, [posts, statusFilter, platformFilter]);

  // Dashboard metrics
  const metrics = useMemo(() => ({
    total: posts.length,
    draft: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled" || p.status === "approved").length,
    published: posts.filter((p) => p.status === "published").length,
    errors: posts.filter((p) => p.status === "error").length,
  }), [posts]);

  const handleSave = async (data: Partial<SocialPost>) => {
    if (data.id) {
      const { id, ...updates } = data;
      return updatePost(id, updates);
    } else {
      return createPost(data);
    }
  };

  const handleEdit = (post: SocialPost) => {
    setEditingPost(post);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este post?")) return;
    await deletePost(id);
    toast({ title: "Post excluído" });
  };

  const handlePublishNow = async (id: string) => {
    if (!confirm("Publicar agora?")) return;
    const result = await publishPost(id, true);
    if (result.success) {
      toast({ title: "Post publicado com sucesso!" });
    } else {
      toast({ title: "Erro ao publicar", description: result.error, variant: "destructive" });
    }
  };

  const handleSchedule = (post: SocialPost) => {
    setEditingPost(post);
    setDialogOpen(true);
  };

  const handleApprove = async (id: string) => {
    await approvePost(id);
    toast({ title: "Post aprovado!" });
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancelar este agendamento?")) return;
    await cancelPost(id);
    toast({ title: "Agendamento cancelado" });
  };

  const handleRetry = async (id: string) => {
    const result = await publishPost(id, true);
    if (result.success) {
      toast({ title: "Publicado com sucesso!" });
    } else {
      toast({ title: "Erro novamente", description: result.error, variant: "destructive" });
    }
  };

  const handleDuplicate = async (post: SocialPost) => {
    await duplicatePost(post);
    toast({ title: "Post duplicado!" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Agendamento Social
              </h1>
              <p className="text-sm text-muted-foreground">Gerencie e agende posts para Facebook e Instagram</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setShowSettings(!showSettings)} title="Configurar Contas">
              <Settings className="h-4 w-4" />
            </Button>
            <Button onClick={() => { setEditingPost(null); setDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Novo Post
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/login");
              }}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6 space-y-6">
        {/* Meta accounts panel */}
        {showSettings && selectedClientId && (
          <MetaConnectPanel clientId={selectedClientId} pages={pages} onRefresh={fetchPages} />
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: metrics.total, color: "text-foreground" },
            { label: "Rascunhos", value: metrics.draft, color: "text-muted-foreground" },
            { label: "Agendados", value: metrics.scheduled, color: "text-info" },
            { label: "Publicados", value: metrics.published, color: "text-success" },
            { label: "Erros", value: metrics.errors, color: "text-destructive" },
          ].map((m) => (
            <Card key={m.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === f.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setPlatformFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${platformFilter === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              Todos
            </button>
            <button
              onClick={() => setPlatformFilter("facebook")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${platformFilter === "facebook" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Facebook className="h-3 w-3" /> Facebook
            </button>
            <button
              onClick={() => setPlatformFilter("instagram")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${platformFilter === "instagram" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              <Instagram className="h-3 w-3" /> Instagram
            </button>
          </div>
        </div>

        {/* Tabs: Calendar / List */}
        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar" className="gap-1">
              <CalendarDays className="h-4 w-4" /> Calendário
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1">
              <List className="h-4 w-4" /> Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-4">
            <SocialCalendar posts={filteredPosts} onPostClick={handleEdit} />
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum post encontrado</p>
                <Button variant="outline" className="mt-3" onClick={() => { setEditingPost(null); setDialogOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" /> Criar primeiro post
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map((post) => (
                  <SocialPostCard
                    key={post.id}
                    post={post}
                    onEdit={handleEdit}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                    onPublishNow={handlePublishNow}
                    onSchedule={handleSchedule}
                    onApprove={handleApprove}
                    onCancel={handleCancel}
                    onRetry={handleRetry}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Post Dialog */}
      <SocialPostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        post={editingPost}
        pages={pages}
        clientId={selectedClientId}
        onSave={handleSave}
        onPublishNow={handlePublishNow}
      />
    </div>
  );
}
