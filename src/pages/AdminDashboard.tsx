import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LanguageSelector } from "@/components/LanguageSelector";
import UserProfileMenu from "@/components/UserProfileMenu";
import { Locale, LOCALE_LABELS, LOCALE_FLAGS } from "@/i18n/translations";
import { Plus, ImagePlus, ExternalLink, Copy, Pencil, Trash2, MessageCircle, Bell, X, RotateCcw, UserPlus, FilePlus, CalendarClock, Users, CalendarDays, Lightbulb, Calendar, Instagram, Facebook, Youtube, Linkedin, Twitter, FileText, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { LABEL_CONFIG } from "@/types/post";
import InviteAdminDialog from "@/components/InviteAdminDialog";
import { TodayAppointmentsWidget } from "@/components/TodayAppointmentsWidget";

interface Client {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  locale: string;
  posting_period: string;
  created_at: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  youtube_url: string;
  linkedin_url: string;
  twitter_url: string;
  website_url: string;
}

interface FeedbackNotification {
  postId: string;
  postTitle: string;
  clientId: string;
  clientName: string;
  clientSlug: string;
  clientLogo: string;
  label: string;
  updatedAt: string;
  deadline: string | null;
  imageUrl: string;
  mediaUrls: string[];
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

interface TodayPost {
  postId: string;
  postTitle: string;
  clientName: string;
  clientSlug: string;
  clientLogo: string;
  deadline: string;
}

const AdminDashboard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackNotification[]>([]);
  const [unarchiveNotifs, setUnarchiveNotifs] = useState<UnarchiveNotification[]>([]);
  const [clientCreatedNotifs, setClientCreatedNotifs] = useState<ClientCreatedNotification[]>([]);
  const [todayPosts, setTodayPosts] = useState<TodayPost[]>([]);
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
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");


  useEffect(() => {
    fetchClients();
    fetchFeedbacks();
    fetchUnarchiveNotifs();
    fetchClientCreatedNotifs();
    fetchTodayPosts();
  }, []);

  const fetchTodayPosts = async () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

    const { data: posts } = await supabase
      .from("posts")
      .select("id, title, client_id, deadline")
      .gte("deadline", startOfDay)
      .lt("deadline", endOfDay)
      .eq("archived", false)
      .order("deadline", { ascending: true });

    if (!posts || posts.length === 0) {
      setTodayPosts([]);
      return;
    }

    const clientIds = [...new Set(posts.map((p: any) => p.client_id).filter(Boolean))];
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name, slug, logo_url")
      .in("id", clientIds);

    const clientMap: Record<string, { name: string; slug: string; logo_url: string }> = {};
    (clientsData || []).forEach((c: any) => { clientMap[c.id] = { name: c.name, slug: c.slug, logo_url: c.logo_url }; });

    setTodayPosts(
      posts.map((p: any) => ({
        postId: p.id,
        postTitle: p.title,
        clientName: clientMap[p.client_id]?.name || "—",
        clientSlug: clientMap[p.client_id]?.slug || "",
        clientLogo: clientMap[p.client_id]?.logo_url || "",
        deadline: p.deadline,
      }))
    );
  };

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
      .select("id, title, client_label, client_id, updated_at, deadline, image_url, media_urls")
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
        clientId: p.client_id,
        clientName: clientMap[p.client_id]?.name || "—",
        clientSlug: clientMap[p.client_id]?.slug || "",
        clientLogo: clientMap[p.client_id]?.logo_url || "",
        label: p.client_label,
        updatedAt: p.updated_at,
        deadline: p.deadline || null,
        imageUrl: p.image_url || "",
        mediaUrls: p.media_urls || [],
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

  const markAsAgendado = async (fb: FeedbackNotification, e: React.MouseEvent) => {
    e.stopPropagation();
    // Ensure "Agendados" column exists for this client
    const { data: existingCols } = await supabase
      .from("columns")
      .select("id, name")
      .eq("client_id", fb.clientId);

    let agendadosColId: string;
    const agendadosCol = (existingCols || []).find((c: any) => c.name.toLowerCase() === "agendados");
    if (agendadosCol) {
      agendadosColId = agendadosCol.id;
    } else {
      const maxPos = (existingCols || []).length;
      const { data: newCol } = await supabase
        .from("columns")
        .insert({ client_id: fb.clientId, name: "Agendados", position: maxPos } as any)
        .select()
        .single();
      if (!newCol) return;
      agendadosColId = (newCol as any).id;
    }

    // Update post: set status to agendado, move to Agendados column, reset label
    await supabase.from("posts").update({
      status: ["agendado"],
      column_id: agendadosColId,
      client_label: "pendente",
    } as any).eq("id", fb.postId);

    setFeedbacks((prev) => prev.filter((f) => f.postId !== fb.postId));
    toast({ title: "Post agendado", description: `"${fb.postTitle}" movido para a coluna Agendados.` });
  };

  const dismissUnarchiveNotif = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("posts").update({ client_unarchived_at: null } as any).eq("id", postId);
    setUnarchiveNotifs((prev) => prev.filter((n) => n.postId !== postId));
  };

  const fetchClientCreatedNotifs = async () => {
    const { data: posts } = await supabase
      .from("posts")
      .select("id, title, client_id, client_created_at")
      .not("client_created_at", "is", null)
      .order("client_created_at", { ascending: false });

    if (!posts || posts.length === 0) {
      setClientCreatedNotifs([]);
      return;
    }

    const clientIds = [...new Set(posts.map((p: any) => p.client_id).filter(Boolean))];
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name, slug, logo_url")
      .in("id", clientIds);

    const clientMap: Record<string, { name: string; slug: string; logo_url: string }> = {};
    (clientsData || []).forEach((c: any) => { clientMap[c.id] = { name: c.name, slug: c.slug, logo_url: c.logo_url }; });

    setClientCreatedNotifs(
      posts.map((p: any) => ({
        postId: p.id,
        postTitle: p.title,
        clientName: clientMap[p.client_id]?.name || "—",
        clientSlug: clientMap[p.client_id]?.slug || "",
        clientLogo: clientMap[p.client_id]?.logo_url || "",
        createdAt: p.client_created_at,
      }))
    );
  };

  const dismissClientCreatedNotif = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("posts").update({ client_created_at: null } as any).eq("id", postId);
    setClientCreatedNotifs((prev) => prev.filter((n) => n.postId !== postId));
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
    setInstagramUrl("");
    setFacebookUrl("");
    setTiktokUrl("");
    setYoutubeUrl("");
    setLinkedinUrl("");
    setTwitterUrl("");
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setSlug(client.slug);
    setLocale(client.locale as Locale);
    setLogoPreview(client.logo_url);
    setLogoFile(null);
    setInstagramUrl(client.instagram_url || "");
    setFacebookUrl(client.facebook_url || "");
    setTiktokUrl(client.tiktok_url || "");
    setYoutubeUrl(client.youtube_url || "");
    setLinkedinUrl(client.linkedin_url || "");
    setTwitterUrl(client.twitter_url || "");
    setWebsiteUrl(client.website_url || "");
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

      const socialFields = {
        instagram_url: instagramUrl,
        facebook_url: facebookUrl,
        tiktok_url: tiktokUrl,
        youtube_url: youtubeUrl,
        linkedin_url: linkedinUrl,
        twitter_url: twitterUrl,
        website_url: websiteUrl,
      };

      if (editingClient) {
        await supabase.from("clients").update({
          name,
          slug,
          locale,
          logo_url: logoUrl,
          ...socialFields,
        } as any).eq("id", editingClient.id);
      } else {
        await supabase.from("clients").insert({
          name,
          slug,
          locale,
          logo_url: logoUrl,
          ...socialFields,
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
    if (!confirm(t("confirmDeleteClient"))) return;
    await supabase.from("clients").delete().eq("id", id);
    fetchClients();
  };

  const copyClientUrl = (slug: string) => {
    const url = `${window.location.origin}/client/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: t("linkCopied"), description: url });
  };

  const baseUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">ContentFlow</h1>
            <p className="text-sm text-muted-foreground">{t("selectOrCreateClient")}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Button variant="outline" size="sm" onClick={() => navigate("/team-management")}>
              <Users className="mr-1 h-4 w-4" /> {t("team")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/social")}>
              <CalendarClock className="mr-1 h-4 w-4" /> {t("social")}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/ideas")} title="Ideias de Pauta">
              <Lightbulb className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/calendar")} title="Calendário de Posts">
              <Calendar className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/briefs")} title="Pautas">
              <FileText className="h-5 w-5" />
            </Button>
            <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> {t("newClient")}
            </Button>
            <UserProfileMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 space-y-6">
        {/* Today's appointments */}
        <TodayAppointmentsWidget />

        {/* Today's posts reminder */}
        {todayPosts.length > 0 && (
          <div className="rounded-xl border border-blue-400/30 bg-blue-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                <CalendarClock className="h-4 w-4 text-blue-500" />
              </div>
              <h2 className="font-semibold text-foreground">{t("postsForToday")}</h2>
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-semibold text-blue-500">
                {todayPosts.length}
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {todayPosts.map((p) => (
                <div
                  key={p.postId}
                  onClick={() => navigate(`/admin/${p.clientSlug}`)}
                  className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors"
                >
                  {p.clientLogo ? (
                    <img src={p.clientLogo} alt={p.clientName} className="h-7 w-7 rounded-full object-contain border shrink-0" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted border shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">{p.clientName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.postTitle}</p>
                    <p className="text-xs text-muted-foreground">{p.clientName}</p>
                  </div>
                  <span className="shrink-0 inline-flex rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
                    {new Date(p.deadline).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback notifications */}
        {feedbacks.length > 0 && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
                <Bell className="h-4 w-4 text-amber-500" />
              </div>
              <h2 className="font-semibold text-foreground">{t("clientFeedbacks")}</h2>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-500">
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
                    {fb.deadline && (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                        <CalendarClock className="h-3 w-3" />
                        {new Date(fb.deadline).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(fb.updatedAt).toLocaleDateString("pt-BR")}
                    </span>
                    <button
                      onClick={(e) => markAsAgendado(fb, e)}
                      className="shrink-0 inline-flex items-center rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-purple-700 transition-colors"
                      title="Marcar como Agendado"
                    >
                      <CalendarClock className="h-3 w-3 mr-0.5" />
                      Agendado
                    </button>
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
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                <RotateCcw className="h-4 w-4 text-emerald-500" />
              </div>
              <h2 className="font-semibold text-foreground">{t("restoredByClient")}</h2>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-500">
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
              <span className="shrink-0 inline-flex rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                    {t("restored")}
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

        {/* Client created post notifications */}
        {clientCreatedNotifs.length > 0 && (
          <div className="rounded-xl border border-violet-400/30 bg-violet-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20">
                <FilePlus className="h-4 w-4 text-violet-500" />
              </div>
              <h2 className="font-semibold text-foreground">{t("postsCreatedByClient")}</h2>
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-semibold text-violet-500">
                {clientCreatedNotifs.length}
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {clientCreatedNotifs.map((n) => (
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
                  <span className="shrink-0 inline-flex rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-500">
                    {t("createdByClient")}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(n.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                  <button
                    onClick={(e) => dismissClientCreatedNotif(n.postId, e)}
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
            <h2 className="text-xl font-semibold text-foreground">{t("noClientsYet")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("createFirstClient")}</p>
            <Button onClick={openCreate} className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> {t("createClient")}
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
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {client.instagram_url && (
                          <a href={client.instagram_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded p-0.5 text-muted-foreground hover:text-pink-500 transition-colors" title="Instagram">
                            <Instagram className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {client.facebook_url && (
                          <a href={client.facebook_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded p-0.5 text-muted-foreground hover:text-blue-600 transition-colors" title="Facebook">
                            <Facebook className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {client.tiktok_url && (
                          <a href={client.tiktok_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors" title="TikTok">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 3.76.92V6.69Z"/></svg>
                          </a>
                        )}
                        {client.youtube_url && (
                          <a href={client.youtube_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded p-0.5 text-muted-foreground hover:text-red-500 transition-colors" title="YouTube">
                            <Youtube className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {client.linkedin_url && (
                          <a href={client.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded p-0.5 text-muted-foreground hover:text-blue-700 transition-colors" title="LinkedIn">
                            <Linkedin className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {client.twitter_url && (
                          <a href={client.twitter_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors" title="X (Twitter)">
                            <Twitter className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {client.website_url && (
                          <a href={client.website_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded p-0.5 text-muted-foreground hover:text-primary transition-colors" title="Website">
                            <Globe className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
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
                    {t("manage")}
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
            <DialogTitle>{editingClient ? t("editClient") : t("newClient")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("clientName")}</Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t("clientNamePlaceholder")}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
            </div>

            <div>
              <Label>{t("slugUrl")}</Label>
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
              <Label>{t("clientLanguage")}</Label>
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
              <Label>{t("logo")}</Label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
              {logoPreview ? (
                <div className="mt-1 flex items-center gap-3">
                  <img src={logoPreview} alt="Logo" className="h-14 w-14 rounded-lg object-contain border" />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    {t("change")}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 py-6 text-sm text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  <ImagePlus className="h-5 w-5" /> {t("selectLogo")}
                  
                </button>
              )}

            <div>
              <Label>Redes Sociais</Label>
              <div className="mt-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-pink-500 shrink-0" />
                  <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." className="flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Facebook className="h-4 w-4 text-blue-600 shrink-0" />
                  <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." className="flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 3.76.92V6.69Z"/></svg>
                  <Input value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} placeholder="https://tiktok.com/@..." className="flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Youtube className="h-4 w-4 text-red-500 shrink-0" />
                  <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." className="flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4 text-blue-700 shrink-0" />
                  <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/..." className="flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Twitter className="h-4 w-4 shrink-0" />
                  <Input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://x.com/..." className="flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary shrink-0" />
                  <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://meusite.com.br" className="flex-1" />
                </div>
              </div>
            </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !name || !slug}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {saving ? "..." : editingClient ? t("save") : t("createClient")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <InviteAdminDialog open={inviteOpen} onOpenChange={setInviteOpen} />

    </div>
  );
};

export default AdminDashboard;
