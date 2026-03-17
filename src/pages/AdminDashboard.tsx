import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Locale, LOCALE_LABELS, LOCALE_FLAGS } from "@/i18n/translations";
import { Plus, ImagePlus, ExternalLink, Copy, Pencil, Trash2, MessageCircle, Bell, X, RotateCcw, UserPlus, LogOut, FilePlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LABEL_CONFIG } from "@/types/post";
import InviteAdminDialog from "@/components/InviteAdminDialog";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  locale: string;
  posting_period: string;
  created_at: string;
}

interface FeedbackNotification {
  postId: string;
  postTitle: string;
  clientName: string;
  clientSlug: string;
  clientLogo: string;
  label: string;
  updatedAt: string;
}

interface UnarchiveNotification {
  postId: string;
  postTitle: string;
  clientName: string;
  clientSlug: string;
  clientLogo: string;
  unarchivedAt: string;
}

interface ClientCreatedNotification {
  postId: string;
  postTitle: string;
  clientName: string;
  clientSlug: string;
  clientLogo: string;
  createdAt: string;
}

const AdminDashboard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackNotification[]>([]);
  const [unarchiveNotifs, setUnarchiveNotifs] = useState<UnarchiveNotification[]>([]);
  const [clientCreatedNotifs, setClientCreatedNotifs] = useState<ClientCreatedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [locale, setLocale] = useState<Locale>("pt");
  const [logoPreview, setLogoPreview] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchFeedbacks();
    fetchUnarchiveNotifs();
    fetchClientCreatedNotifs();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients((data as Client[]) || []);
    setLoading(false);
  };

  const fetchFeedbacks = async () => {
    // Fetch posts where client gave feedback (label != pendente)
    const { data: posts } = await supabase
      .from("posts")
      .select("id, title, client_label, client_id, updated_at")
      .neq("client_label", "pendente")
      .order("updated_at", { ascending: false });

    if (!posts || posts.length === 0) {
      setFeedbacks([]);
      return;
    }

    const clientIds = [...new Set(posts.map((p: any) => p.client_id).filter(Boolean))];
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name, slug, logo_url")
      .in("id", clientIds);

    const clientMap: Record<string, { name: string; slug: string; logo_url: string }> = {};
    (clientsData || []).forEach((c: any) => { clientMap[c.id] = { name: c.name, slug: c.slug, logo_url: c.logo_url }; });

    setFeedbacks(
      posts.map((p: any) => ({
        postId: p.id,
        postTitle: p.title,
        clientName: clientMap[p.client_id]?.name || "—",
        clientSlug: clientMap[p.client_id]?.slug || "",
        clientLogo: clientMap[p.client_id]?.logo_url || "",
        label: p.client_label,
        updatedAt: p.updated_at,
      }))
    );
  };

  const fetchUnarchiveNotifs = async () => {
    const { data: posts } = await supabase
      .from("posts")
      .select("id, title, client_id, client_unarchived_at")
      .not("client_unarchived_at", "is", null)
      .order("client_unarchived_at", { ascending: false });

    if (!posts || posts.length === 0) {
      setUnarchiveNotifs([]);
      return;
    }

    const clientIds = [...new Set(posts.map((p: any) => p.client_id).filter(Boolean))];
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name, slug, logo_url")
      .in("id", clientIds);

    const clientMap: Record<string, { name: string; slug: string; logo_url: string }> = {};
    (clientsData || []).forEach((c: any) => { clientMap[c.id] = { name: c.name, slug: c.slug, logo_url: c.logo_url }; });

    setUnarchiveNotifs(
      posts.map((p: any) => ({
        postId: p.id,
        postTitle: p.title,
        clientName: clientMap[p.client_id]?.name || "—",
        clientSlug: clientMap[p.client_id]?.slug || "",
        clientLogo: clientMap[p.client_id]?.logo_url || "",
        unarchivedAt: p.client_unarchived_at,
      }))
    );
  };

  const dismissFeedback = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("posts").update({ client_label: "pendente" } as any).eq("id", postId);
    setFeedbacks((prev) => prev.filter((fb) => fb.postId !== postId));
  };

  const dismissUnarchiveNotif = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("posts").update({ client_unarchived_at: null } as any).eq("id", postId);
    setUnarchiveNotifs((prev) => prev.filter((n) => n.postId !== postId));
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingClient) {
      setSlug(generateSlug(value));
    }
  };

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const openCreate = () => {
    setEditingClient(null);
    setName("");
    setSlug("");
    setLocale("pt");
    setLogoPreview("");
    setLogoFile(null);
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setSlug(client.slug);
    setLocale(client.locale as Locale);
    setLogoPreview(client.logo_url);
    setLogoFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name || !slug) return;
    setSaving(true);
    try {
      let logoUrl = editingClient?.logo_url || "";
      if (logoFile) {
        const ext = logoFile.name.split(".").pop();
        const fileName = `logos/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("media").upload(fileName, logoFile);
        if (error) throw error;
        const { data } = supabase.storage.from("media").getPublicUrl(fileName);
        logoUrl = data.publicUrl;
      }

      if (editingClient) {
        await supabase.from("clients").update({
          name,
          slug,
          locale,
          logo_url: logoUrl,
        } as any).eq("id", editingClient.id);
      } else {
        await supabase.from("clients").insert({
          name,
          slug,
          locale,
          logo_url: logoUrl,
        } as any);
      }

      setDialogOpen(false);
      fetchClients();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;
    await supabase.from("clients").delete().eq("id", id);
    fetchClients();
  };

  const copyClientUrl = (slug: string) => {
    const url = `${window.location.origin}/client/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: url });
  };

  const baseUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ContentFlow</h1>
            <p className="text-sm text-muted-foreground">Selecione ou crie um cliente</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-1 h-4 w-4" /> Convidar
            </Button>
            <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> Novo Cliente
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

      <main className="mx-auto max-w-5xl p-6 space-y-6">
        {/* Feedback notifications */}
        {feedbacks.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/20">
                <Bell className="h-4 w-4 text-warning-foreground" />
              </div>
              <h2 className="font-semibold text-foreground">Feedbacks dos Clientes</h2>
              <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning-foreground">
                {feedbacks.length}
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {feedbacks.map((fb) => {
                const labelConfig = LABEL_CONFIG[fb.label as keyof typeof LABEL_CONFIG];
                return (
                  <div
                    key={fb.postId}
                    onClick={() => navigate(`/admin/${fb.clientSlug}`)}
                    className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors"
                  >
                    {fb.clientLogo ? (
                      <img src={fb.clientLogo} alt={fb.clientName} className="h-7 w-7 rounded-full object-contain border shrink-0" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted border shrink-0">
                        <span className="text-xs font-bold text-muted-foreground">{fb.clientName.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{fb.postTitle}</p>
                      <p className="text-xs text-muted-foreground">{fb.clientName}</p>
                    </div>
                    {labelConfig && (
                      <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${labelConfig.color}`}>
                        {labelConfig.label}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(fb.updatedAt).toLocaleDateString("pt-BR")}
                    </span>
                    <button
                      onClick={(e) => dismissFeedback(fb.postId, e)}
                      className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title="Dispensar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unarchive notifications */}
        {unarchiveNotifs.length > 0 && (
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info/20">
                <RotateCcw className="h-4 w-4 text-info-foreground" />
              </div>
              <h2 className="font-semibold text-foreground">Posts Restaurados pelo Cliente</h2>
              <span className="rounded-full bg-info/20 px-2 py-0.5 text-xs font-semibold text-info-foreground">
                {unarchiveNotifs.length}
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {unarchiveNotifs.map((n) => (
                <div
                  key={n.postId}
                  onClick={() => navigate(`/admin/${n.clientSlug}`)}
                  className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors"
                >
                  {n.clientLogo ? (
                    <img src={n.clientLogo} alt={n.clientName} className="h-7 w-7 rounded-full object-contain border shrink-0" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted border shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">{n.clientName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{n.postTitle}</p>
                    <p className="text-xs text-muted-foreground">{n.clientName}</p>
                  </div>
                  <span className="shrink-0 inline-flex rounded-full bg-info/20 px-2 py-0.5 text-[10px] font-semibold text-info-foreground">
                    Restaurado
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(n.unarchivedAt).toLocaleDateString("pt-BR")}
                  </span>
                  <button
                    onClick={(e) => dismissUnarchiveNotif(n.postId, e)}
                    className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    title="Dispensar"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-muted p-6">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Nenhum cliente ainda</h2>
            <p className="mt-1 text-sm text-muted-foreground">Crie seu primeiro cliente para começar</p>
            <Button onClick={openCreate} className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> Criar Cliente
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="group relative flex flex-col rounded-xl border bg-card p-5 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-center gap-3 mb-3">
                  {client.logo_url ? (
                    <img src={client.logo_url} alt={client.name} className="h-12 w-12 rounded-lg object-contain border" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted">
                      <span className="text-lg font-bold text-muted-foreground">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {LOCALE_FLAGS[client.locale as Locale]} {LOCALE_LABELS[client.locale as Locale]}
                    </p>
                  </div>
                </div>

                <div className="mb-4 flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{baseUrl}/client/{client.slug}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyClientUrl(client.slug); }}
                    className="ml-auto flex-shrink-0 rounded p-0.5 hover:bg-background"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-auto flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/admin/${client.slug}`)}
                  >
                    Gerenciar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(client)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(client.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create / Edit Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Cliente</Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Empresa XYZ"
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
            </div>

            <div>
              <Label>Slug (URL)</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">/client/</span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="empresa-xyz"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label>Idioma do Cliente</Label>
              <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LOCALE_LABELS) as Locale[]).map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {LOCALE_FLAGS[loc]} {LOCALE_LABELS[loc]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Logo</Label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
              {logoPreview ? (
                <div className="mt-1 flex items-center gap-3">
                  <img src={logoPreview} alt="Logo" className="h-14 w-14 rounded-lg object-contain border" />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Alterar
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-6 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  <ImagePlus className="h-5 w-5" />
                  Selecionar logo
                </button>
              )}
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !name || !slug}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving ? "..." : editingClient ? "Salvar" : "Criar Cliente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <InviteAdminDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
};

export default AdminDashboard;
