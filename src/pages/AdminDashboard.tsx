import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UserProfileMenu from "@/components/UserProfileMenu";
import { Locale, LOCALE_LABELS, LOCALE_FLAGS } from "@/i18n/translations";
import { Plus, ImagePlus, ExternalLink, Copy, Pencil, Trash2, MessageCircle, Bell, X, RotateCcw, UserPlus, FilePlus, CalendarClock, Users, User, CalendarDays, Lightbulb, Calendar, Instagram, Facebook, Youtube, Linkedin, Twitter, FileText, FileBarChart, Globe, CheckCircle2, Shield, Share2, Lock, Menu, LayoutDashboard, Settings, CalendarHeart, History as HistoryIcon, DollarSign, Eye } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";
import { LABEL_CONFIG, Post, PostStatus, ClientLabel, STATUS_CONFIG, Tag, DEFAULT_TAGS } from "@/types/post";
import InviteAdminDialog from "@/components/InviteAdminDialog";
import { TodayAppointmentsWidget } from "@/components/TodayAppointmentsWidget";
import { CommemorativeDatesWidget } from "@/components/CommemorativeDatesWidget";
import { PostDetailDialog } from "@/components/PostDetailDialog";
import { TodayTasksWidget } from "@/components/TodayTasksWidget";
import { NotificationBell } from "@/components/NotificationBell";

const CLIENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  standard: { label: "Padrão", color: "bg-muted text-muted-foreground" },
  premium: { label: "Premium", color: "bg-amber-500/15 text-amber-600" },
  partner: { label: "Parceiro", color: "bg-emerald-500/15 text-emerald-600" },
  vip: { label: "VIP", color: "bg-purple-500/15 text-purple-600" },
};

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
  owner_id: string | null;
  shared: boolean;
  client_type: string;
}

interface ClientUser {
  userId: string;
  email: string;
  fullName?: string;
}

interface ClientUserMap {
  [clientId: string]: ClientUser[];
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

interface StatusNotification {
  id: string;
  title: string;
  message: string;
  clientId: string | null;
  postId: string | null;
  createdAt: string;
  actorAvatarUrl: string;
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
  const location = useLocation();
  const currentPath = location.pathname;
  const { role, userId: currentUserId, isSuperAdmin, isAdmin } = useUserRole();
  const navItemClass = (path: string) => cn(
    "flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors",
    currentPath === path
      ? "bg-primary/10 text-primary border-l-2 border-primary"
      : "text-foreground hover:bg-muted"
  );
  const navIconClass = (path: string) => cn(
    "h-4 w-4",
    currentPath === path ? "text-primary" : "text-muted-foreground"
  );
  const [clients, setClients] = useState<Client[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackNotification[]>([]);
  const [unarchiveNotifs, setUnarchiveNotifs] = useState<UnarchiveNotification[]>([]);
  const [clientCreatedNotifs, setClientCreatedNotifs] = useState<ClientCreatedNotification[]>([]);
  const [statusNotifs, setStatusNotifs] = useState<StatusNotification[]>([]);
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
  const [viewPost, setViewPost] = useState<Post | null>(null);
  const [viewPostOpen, setViewPostOpen] = useState(false);
  const [clientFilter, setClientFilter] = useState<"all" | "mine" | "shared">("all");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [existingClientUser, setExistingClientUser] = useState<ClientUser | null>(null);
  const [clientType, setClientType] = useState("standard");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareClientId, setShareClientId] = useState<string | null>(null);
  const [allAdmins, setAllAdmins] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [shareSelectedUsers, setShareSelectedUsers] = useState<Set<string>>(new Set());
  const [clientAssignments, setClientAssignments] = useState<{ user_id: string; client_id: string }[]>([]);
  const [clientUsersMap, setClientUsersMap] = useState<ClientUserMap>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [appLogo, setAppLogo] = useState<string | null>(null);
  const appLogoInputRef = useRef<HTMLInputElement>(null);

  const fetchStatusNotifs = async () => {
    setStatusNotifs([]);
  };

  const dismissStatusNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("admin_notifications").update({ read: true } as any).eq("id", id);
    setStatusNotifs((prev) => prev.filter((n) => n.id !== id));
  };


  // Notification sound ref
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    notificationAudioRef.current = new Audio("/notification.wav");
  }, []);

  const playNotificationSound = () => {
    if (notificationAudioRef.current) {
      notificationAudioRef.current.currentTime = 0;
      notificationAudioRef.current.play().catch(() => {});
    }
  };

  // Fetch app logo from app_settings
  useEffect(() => {
    const fetchAppLogo = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "app_logo_url")
        .maybeSingle();
      if (data?.value) setAppLogo(data.value);
    };
    fetchAppLogo();
  }, []);

  const handleAppLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { compressImage } = await import("@/lib/imageCompressor");
    const compressed = await compressImage(file);
    const ext = compressed.name.split(".").pop();
    const path = `app-logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("app-branding").upload(path, compressed, { upsert: true });
    if (uploadError) {
      toast({ title: "Erro ao enviar logo", description: uploadError.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("app-branding").getPublicUrl(path);
    const logoUrl = urlData.publicUrl;
    const { error: settingsError } = await supabase
      .from("app_settings")
      .upsert({ key: "app_logo_url", value: logoUrl, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (settingsError) {
      toast({ title: "Erro ao salvar configuração", description: settingsError.message, variant: "destructive" });
      return;
    }
    setAppLogo(logoUrl);
    toast({ title: "Logo atualizado com sucesso!" });
  };

  useEffect(() => {
    if (role === null && currentUserId === null) return; // still loading
    fetchClients().then(() => fetchClientUsers());
    fetchFeedbacks();
    fetchUnarchiveNotifs();
    fetchClientCreatedNotifs();
    fetchTodayPosts();
    fetchStatusNotifs();

    // Realtime: refresh feedbacks when any post's client_label changes
    const channel = supabase
      .channel("feedback-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          const oldLabel = (payload.old as any)?.client_label;
          const newLabel = (payload.new as any)?.client_label;
          if (oldLabel !== newLabel) {
            fetchFeedbacks();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, currentUserId]);

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
    
    if (currentUserId) {
      // Get assigned clients
      const { data: assignments } = await supabase
        .from("user_client_assignments")
        .select("client_id")
        .eq("user_id", currentUserId);
      
      const assignedIds = (assignments || []).map((a: any) => a.client_id);

      // Get owned clients
      const { data: ownedClients } = await supabase
        .from("clients")
        .select("*")
        .eq("owner_id", currentUserId);
      
      const ownedIds = (ownedClients || []).map((c: any) => c.id);

      // For super_admin, also get shared clients
      let sharedClients: Client[] = [];
      if (isSuperAdmin) {
        const { data } = await supabase
          .from("clients")
          .select("*")
          .eq("shared", true);
        sharedClients = (data as Client[]) || [];
      }

      // Merge all unique client IDs
      const allIds = [...new Set([...assignedIds, ...ownedIds, ...sharedClients.map(c => c.id)])];
      
      if (allIds.length > 0) {
        const { data } = await supabase.from("clients").select("*").in("id", allIds).order("created_at", { ascending: false });
        setClients((data as Client[]) || []);
      } else {
        setClients([]);
      }
    }
    
    setLoading(false);
  };

  const fetchClientUsers = async () => {
    // Get all client role users
    const { data: clientRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "client");
    
    if (!clientRoles || clientRoles.length === 0) {
      setClientUsersMap({});
      return;
    }

    const clientUserIds = clientRoles.map(r => r.user_id);

    // Get their assignments
    const { data: assignments } = await supabase
      .from("user_client_assignments")
      .select("user_id, client_id")
      .in("user_id", clientUserIds);

    // Get their profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", clientUserIds);

    const profileMap: Record<string, { full_name: string; email: string }> = {};
    (profiles || []).forEach(p => { profileMap[p.id] = { full_name: p.full_name, email: p.email }; });

    const map: ClientUserMap = {};
    (assignments || []).forEach(a => {
      if (!map[a.client_id]) map[a.client_id] = [];
      const profile = profileMap[a.user_id];
      if (profile) {
        map[a.client_id].push({ userId: a.user_id, email: profile.email, fullName: profile.full_name });
      }
    });
    setClientUsersMap(map);
  };

  const fetchFeedbacks = async () => {
    if (!currentUserId) return;

    // Get allowed client IDs (owned + assigned + shared)
    const { data: assignments } = await supabase
      .from("user_client_assignments")
      .select("client_id")
      .eq("user_id", currentUserId);
    const assignedIds = (assignments || []).map((a: any) => a.client_id);

    const { data: ownedClients } = await supabase
      .from("clients")
      .select("id")
      .eq("owner_id", currentUserId);
    const ownedIds = (ownedClients || []).map((c: any) => c.id);

    let sharedIds: string[] = [];
    if (isSuperAdmin) {
      const { data: sharedClients } = await supabase
        .from("clients")
        .select("id")
        .eq("shared", true);
      sharedIds = (sharedClients || []).map((c: any) => c.id);
    }

    const allowedIds = [...new Set([...assignedIds, ...ownedIds, ...sharedIds])];
    if (allowedIds.length === 0) {
      setFeedbacks([]);
      return;
    }

    // Fetch posts where client gave feedback (label != pendente)
    const { data: posts } = await supabase
      .from("posts")
      .select("id, title, client_label, client_id, updated_at, deadline, image_url, media_urls")
      .neq("client_label", "pendente")
      .in("client_id", allowedIds)
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
    setClientEmail("");
    setClientPassword("");
    setExistingClientUser(null);
    setClientType("standard");
    setDialogOpen(true);
  };

  const openEdit = async (client: Client) => {
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
    setClientType(client.client_type || "standard");
    setClientPassword("");

    // Load existing client user
    const { data: assignments } = await supabase
      .from("user_client_assignments")
      .select("user_id")
      .eq("client_id", client.id);

    if (assignments && assignments.length > 0) {
      // Check if any assigned user has client role
      for (const a of assignments) {
        const { data: hasClientRole } = await supabase.rpc("has_role" as any, {
          _user_id: a.user_id,
          _role: "client",
        });
        if (hasClientRole) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", a.user_id)
            .single();
          setExistingClientUser({ userId: a.user_id, email: profile?.email || "" });
          setClientEmail(profile?.email || "");
          break;
        }
      }
      if (!existingClientUser) {
        setExistingClientUser(null);
        setClientEmail("");
      }
    } else {
      setExistingClientUser(null);
      setClientEmail("");
    }

    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name || !slug) return;
    setSaving(true);
    try {
      let logoUrl = editingClient?.logo_url || "";
      if (logoFile) {
        const { compressImage } = await import("@/lib/imageCompressor");
        const compressed = await compressImage(logoFile);
        const ext = compressed.name.split(".").pop();
        const fileName = `logos/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("media").upload(fileName, compressed);
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

      let clientId = editingClient?.id;

      if (editingClient) {
        await supabase.from("clients").update({
          name,
          slug,
          locale,
          logo_url: logoUrl,
          client_type: clientType,
          ...socialFields,
        } as any).eq("id", editingClient.id);
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: newClient } = await supabase.from("clients").insert({
          name,
          slug,
          locale,
          logo_url: logoUrl,
          owner_id: session?.user?.id || null,
          client_type: clientType,
          ...socialFields,
        } as any).select().single();
        clientId = (newClient as any)?.id;
        
        // Auto-assign client to creator if not super_admin
        if (clientId && session?.user && !isSuperAdmin) {
          await supabase.from("user_client_assignments").insert({
            user_id: session.user.id,
            client_id: clientId,
          } as any);
        }
      }

      // Create or update client user login
      if (clientId && clientEmail) {
        if (existingClientUser) {
          // Update existing client user
          if (clientEmail !== existingClientUser.email || clientPassword) {
            const { data: result, error: fnError } = await supabase.functions.invoke("create-client-user", {
              body: {
                mode: "update",
                user_id: existingClientUser.userId,
                email: clientEmail !== existingClientUser.email ? clientEmail : undefined,
                password: clientPassword || undefined,
              },
            });
            if (fnError) {
              toast({ title: "Erro ao atualizar login do cliente", description: fnError.message, variant: "destructive" });
            } else if (result?.error) {
              toast({ title: "Erro ao atualizar login do cliente", description: result.error, variant: "destructive" });
            } else {
              toast({ title: "Login do cliente atualizado" });
            }
          }
        } else if (clientPassword) {
          // Create new client user
          const { data: result, error: fnError } = await supabase.functions.invoke("create-client-user", {
            body: {
              mode: "create",
              email: clientEmail,
              password: clientPassword,
              client_id: clientId,
              client_name: name,
            },
          });
          if (fnError) {
            toast({ title: "Erro ao criar login do cliente", description: fnError.message, variant: "destructive" });
          } else if (result?.error) {
            toast({ title: "Erro ao criar login do cliente", description: result.error, variant: "destructive" });
          } else {
            toast({ title: "Login do cliente criado com sucesso" });
          }
        }
      }

      setDialogOpen(false);
      fetchClients().then(() => fetchClientUsers());
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
      <header className="sticky top-0 z-30 glass-header">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-3">
            {/* Menu hamburger */}
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            {/* App logo upload area */}
            <input type="file" accept="image/*" ref={appLogoInputRef} className="hidden" onChange={handleAppLogoUpload} />
            {isAdmin ? (
              <button
                type="button"
                onClick={() => appLogoInputRef.current?.click()}
                className="relative group shrink-0"
                title="Clique para alterar o logo"
              >
                {appLogo ? (
                  <img src={appLogo} alt="Logo" className="h-9 w-9 md:h-10 md:w-10 rounded-lg object-contain border bg-card" />
                ) : (
                  <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg border border-dashed border-muted-foreground/40 bg-muted flex items-center justify-center">
                    <ImagePlus className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Pencil className="h-3.5 w-3.5 text-white" />
                </div>
              </button>
            ) : appLogo ? (
              <img src={appLogo} alt="Logo" className="h-9 w-9 md:h-10 md:w-10 rounded-lg object-contain border bg-card shrink-0" />
            ) : null}
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Design Hub</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{t("selectOrCreateClient")}</p>
            </div>
          </div>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/team-management")}>
                <Users className="mr-1 h-4 w-4" /> {t("team")}
              </Button>
            )}
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/social")}>
                <CalendarClock className="mr-1 h-4 w-4" /> {t("social")}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setNavDrawerOpen(true)} title="Menu">
              <Menu className="h-5 w-5" />
            </Button>
            {isAdmin && (
              <Button onClick={openCreate} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> Clientes
            </Button>
            )}
            <NotificationBell />
            <UserProfileMenu />
          </div>
          {/* Mobile: only essential actions */}
          <div className="flex md:hidden items-center gap-1">
            <NotificationBell />
            {isAdmin && (
              <Button size="icon" variant="ghost" onClick={openCreate}>
                <Plus className="h-5 w-5" />
              </Button>
            )}
            <UserProfileMenu />
          </div>
        </div>
      </header>

      {/* Mobile drawer menu */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="text-left text-lg font-bold flex items-center gap-2">
              {appLogo && <img src={appLogo} alt="Logo" className="h-7 w-7 rounded-md object-contain" />}
              Design Hub
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col py-2">
            {role && (
              <div className="px-5 py-2">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  isSuperAdmin ? "bg-amber-500/15 text-amber-600" : "bg-blue-500/15 text-blue-600"
                )}>
                  <Shield className="h-3 w-3" />
                  {isSuperAdmin ? "Super Admin" : role === "admin" ? "Admin" : "Colaborador"}
                </span>
              </div>
            )}
            <nav className="flex flex-col">
              <button onClick={() => { setMobileMenuOpen(false); navigate("/admin"); }} className={navItemClass("/admin")}>
                <LayoutDashboard className={navIconClass("/admin")} /> Dashboard
              </button>
              {isAdmin && (
                <button onClick={() => { setMobileMenuOpen(false); openCreate(); }} className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  <Plus className="h-4 w-4 text-muted-foreground" /> Novo Cliente
                </button>
              )}
              {isAdmin && (
                <button onClick={() => { setMobileMenuOpen(false); navigate("/team-management"); }} className={navItemClass("/team-management")}>
                  <Users className={navIconClass("/team-management")} /> {t("team")}
                </button>
              )}
              {isAdmin && (
                <button onClick={() => { setMobileMenuOpen(false); navigate("/social"); }} className={navItemClass("/social")}>
                  <CalendarClock className={navIconClass("/social")} /> {t("social")}
                </button>
              )}
              <button onClick={() => { setMobileMenuOpen(false); navigate("/ideas"); }} className={navItemClass("/ideas")}>
                <Lightbulb className={navIconClass("/ideas")} /> Ideias de Pauta
              </button>
              <button onClick={() => { setMobileMenuOpen(false); navigate("/calendar"); }} className={navItemClass("/calendar")}>
                <Calendar className={navIconClass("/calendar")} /> Calendário
              </button>
              <button onClick={() => { setMobileMenuOpen(false); navigate("/briefs"); }} className={navItemClass("/briefs")}>
                <FileText className={navIconClass("/briefs")} /> Pautas
              </button>
              <button onClick={() => { setMobileMenuOpen(false); navigate("/reports"); }} className={navItemClass("/reports")}>
                <FileBarChart className={navIconClass("/reports")} /> Relatórios
              </button>
              <button onClick={() => { setMobileMenuOpen(false); navigate("/billing"); }} className={navItemClass("/billing")}>
                <DollarSign className={navIconClass("/billing")} /> Faturamento
              </button>
              <button onClick={() => { setMobileMenuOpen(false); navigate("/commemorative-dates"); }} className={navItemClass("/commemorative-dates")}>
                <CalendarHeart className={navIconClass("/commemorative-dates")} /> Datas Comemorativas
              </button>
              {/* Activity log link removed */}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop nav drawer */}
      <Sheet open={navDrawerOpen} onOpenChange={setNavDrawerOpen}>
        <SheetContent side="right" className="w-64 p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="text-left text-base font-semibold">Navegação</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col py-2">
            <button onClick={() => { setNavDrawerOpen(false); navigate("/ideas"); }} className={navItemClass("/ideas")}>
              <Lightbulb className={navIconClass("/ideas")} /> Ideias de Pauta
            </button>
            <button onClick={() => { setNavDrawerOpen(false); navigate("/calendar"); }} className={navItemClass("/calendar")}>
              <Calendar className={navIconClass("/calendar")} /> Calendário
            </button>
            <button onClick={() => { setNavDrawerOpen(false); navigate("/briefs"); }} className={navItemClass("/briefs")}>
              <FileText className={navIconClass("/briefs")} /> Pautas
            </button>
            <button onClick={() => { setNavDrawerOpen(false); navigate("/reports"); }} className={navItemClass("/reports")}>
              <FileBarChart className={navIconClass("/reports")} /> Relatórios
            </button>
            <button onClick={() => { setNavDrawerOpen(false); navigate("/billing"); }} className={navItemClass("/billing")}>
              <DollarSign className={navIconClass("/billing")} /> Faturamento
            </button>
            <button onClick={() => { setNavDrawerOpen(false); navigate("/commemorative-dates"); }} className={navItemClass("/commemorative-dates")}>
              <CalendarHeart className={navIconClass("/commemorative-dates")} /> Datas Comemorativas
            </button>
            {/* Activity log link removed */}
          </nav>
        </SheetContent>
      </Sheet>

      <main className="mx-auto max-w-5xl px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Today's tasks with deadline priority */}
        <TodayTasksWidget />

        {/* Today's appointments */}
        <TodayAppointmentsWidget />

        {/* Commemorative dates widget */}
        <CommemorativeDatesWidget />


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

        {/* Status change notifications (team finalizado) */}
        {statusNotifs.length > 0 && (
          <div className="rounded-xl border border-green-400/30 bg-green-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <h2 className="font-semibold text-foreground">Posts Finalizados pela Equipe</h2>
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-500">
                {statusNotifs.length}
              </span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {statusNotifs.map((n) => {
                const client = clients.find(c => c.id === n.clientId);
                return (
                  <div
                    key={n.id}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!n.postId) return;
                      const { data: postData } = await supabase.from("posts").select("*").eq("id", n.postId).maybeSingle();
                      if (postData) {
                        const p: Post = {
                          id: postData.id,
                          title: postData.title,
                          imageUrl: postData.image_url,
                          mediaType: (postData.media_type as any) || "image",
                          mediaUrls: postData.media_urls || [],
                          caption: postData.caption || "",
                          deadline: postData.deadline ? new Date(postData.deadline) : null,
                          status: (postData.status || []) as PostStatus[],
                          clientLabel: (postData.client_label || "pendente") as ClientLabel,
                          comments: [],
                          tags: postData.tags || [],
                          createdAt: new Date(postData.created_at),
                          columnId: postData.column_id,
                          position: postData.position,
                          archived: postData.archived,
                          archivedAt: postData.archived_at ? new Date(postData.archived_at) : null,
                          trelloCardId: postData.trello_card_id,
                        };
                        setViewPost(p);
                        setViewPostOpen(true);
                      }
                    }}
                    className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors"
                  >
                    {n.actorAvatarUrl ? (
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={n.actorAvatarUrl} />
                        <AvatarFallback className="text-[10px]">{n.title.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ) : client?.logo_url ? (
                      <img src={client.logo_url} alt={client.name} className="h-7 w-7 rounded-full object-contain border shrink-0" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted border shrink-0">
                        <span className="text-xs font-bold text-muted-foreground">{n.title.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{n.message}</p>
                      <p className="text-xs text-muted-foreground">{n.title}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(n.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    <button
                      onClick={(e) => dismissStatusNotif(n.id, e)}
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
                    className="rounded-lg bg-muted/50 px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {fb.clientLogo ? (
                        <img src={fb.clientLogo} alt={fb.clientName} className="h-7 w-7 rounded-full object-contain border shrink-0" />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted border shrink-0">
                          <span className="text-xs font-bold text-muted-foreground">{fb.clientName.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <HoverCard openDelay={200} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <p className="text-sm font-medium text-foreground truncate cursor-pointer hover:underline">{fb.postTitle}</p>
                          </HoverCardTrigger>
                          <HoverCardContent side="top" className="w-72 p-2" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const previewUrls = fb.mediaUrls.length > 0 ? fb.mediaUrls : fb.imageUrl ? [fb.imageUrl] : [];
                              return previewUrls.length > 0 ? (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-foreground truncate">{fb.postTitle}</p>
                                  <div className={cn("grid gap-1", previewUrls.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                                    {previewUrls.slice(0, 4).map((url, i) => (
                                      <img key={i} src={url} alt={`${fb.postTitle} ${i + 1}`} className="w-full rounded-md object-cover aspect-square" />
                                    ))}
                                  </div>
                                  {previewUrls.length > 4 && (
                                    <p className="text-[10px] text-muted-foreground text-center">+{previewUrls.length - 4} mais</p>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                                  Sem mídia
                                </div>
                              );
                            })()}
                          </HoverCardContent>
                        </HoverCard>
                        <p className="text-xs text-muted-foreground">{fb.clientName}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                        {new Date(fb.updatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 ml-10 flex-wrap">
                      {labelConfig && (
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${labelConfig.color}`}>
                          {labelConfig.label}
                        </span>
                      )}
                      {fb.deadline && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
                          <CalendarClock className="h-3 w-3" />
                          {new Date(fb.deadline).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground sm:hidden">
                        {new Date(fb.updatedAt).toLocaleDateString("pt-BR")}
                      </span>
                      <div className="flex-1" />
                       <button
                         onClick={async (e) => {
                           e.stopPropagation();
                           const { data: postData } = await supabase.from("posts").select("*").eq("id", fb.postId).maybeSingle();
                           if (postData) {
                             const p: Post = {
                               id: postData.id,
                               title: postData.title,
                               imageUrl: postData.image_url,
                               mediaType: (postData.media_type as any) || "image",
                               mediaUrls: postData.media_urls || [],
                               caption: postData.caption || "",
                               deadline: postData.deadline ? new Date(postData.deadline) : null,
                               status: (postData.status || []) as PostStatus[],
                               clientLabel: (postData.client_label || "pendente") as ClientLabel,
                               comments: [],
                               tags: postData.tags || [],
                               createdAt: new Date(postData.created_at),
                               columnId: postData.column_id,
                               position: postData.position,
                               archived: postData.archived,
                               archivedAt: postData.archived_at ? new Date(postData.archived_at) : null,
                               trelloCardId: postData.trello_card_id,
                             };
                             setViewPost(p);
                             setViewPostOpen(true);
                           }
                         }}
                         className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                         title="Ver post completo"
                       >
                         <Eye className="h-3 w-3 mr-0.5" />
                         Ver
                       </button>
                       <button
                         onClick={(e) => markAsAgendado(fb, e)}
                         className="inline-flex items-center rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-purple-700 transition-colors"
                         title="Marcar como Agendado"
                       >
                         <CalendarClock className="h-3 w-3 mr-0.5" />
                         Agendado
                       </button>
                       <button
                         onClick={(e) => dismissFeedback(fb.postId, e)}
                         className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                         title="Dispensar"
                       >
                         <X className="h-3.5 w-3.5" />
                       </button>
                     </div>
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
            {isSuperAdmin && (
              <Button onClick={openCreate} className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="mr-2 h-4 w-4" /> {t("createClient")}
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Filter tabs for super admin */}
            {isSuperAdmin && (
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setClientFilter("all")}
                  className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", clientFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                >
                  Todos ({clients.length})
                </button>
                <button
                  onClick={() => setClientFilter("mine")}
                  className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", clientFilter === "mine" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                >
                  Meus ({clients.filter(c => c.owner_id === currentUserId).length})
                </button>
                <button
                  onClick={() => setClientFilter("shared")}
                  className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", clientFilter === "shared" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                >
                  <Share2 className="inline h-3 w-3 mr-1" />
                  Compartilhados ({clients.filter(c => c.shared).length})
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clients
                .filter(c => {
                  if (!isSuperAdmin || clientFilter === "all") return true;
                  if (clientFilter === "mine") return c.owner_id === currentUserId;
                  if (clientFilter === "shared") return c.shared;
                  return true;
                })
                .map((client) => (
                <div
                  key={client.id}
                  className="group relative flex flex-col rounded-xl border bg-card p-5 transition-all hover:shadow-lg hover:border-primary/20"
                >
                  {/* Top badges row */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {/* Client type badge */}
                    {(() => {
                      const typeConfig = CLIENT_TYPE_CONFIG[client.client_type] || CLIENT_TYPE_CONFIG.standard;
                      return (
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", typeConfig.color)}>
                          {typeConfig.label}
                        </span>
                      );
                    })()}
                    {client.owner_id === currentUserId && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600" title="Você é o dono">
                        <Shield className="h-2.5 w-2.5" />
                      </span>
                    )}
                    {client.shared && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600" title="Compartilhado">
                        <Share2 className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Client info */}
                  <div className="flex items-center gap-3 mb-4">
                    {client.logo_url ? (
                      <img src={client.logo_url} alt={client.name} className="h-12 w-12 rounded-xl object-contain border bg-background" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted">
                        <span className="text-lg font-bold text-muted-foreground">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-base">{client.name}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {LOCALE_FLAGS[client.locale as Locale]} {LOCALE_LABELS[client.locale as Locale]}
                        </span>
                        {clientUsersMap[client.id] && clientUsersMap[client.id].length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground ml-1" title={`${clientUsersMap[client.id].length} acesso(s)`}>
                            <User className="h-3 w-3" />
                            {clientUsersMap[client.id].length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Social links row */}
                  <div className="flex items-center gap-1 mb-3">
                    {client.instagram_url && (
                      <a href={client.instagram_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-md p-1 text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10 transition-colors" title="Instagram">
                        <Instagram className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {client.facebook_url && (
                      <a href={client.facebook_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-md p-1 text-muted-foreground hover:text-blue-600 hover:bg-blue-600/10 transition-colors" title="Facebook">
                        <Facebook className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {client.tiktok_url && (
                      <a href={client.tiktok_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="TikTok">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 3.76.92V6.69Z"/></svg>
                      </a>
                    )}
                    {client.youtube_url && (
                      <a href={client.youtube_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-md p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors" title="YouTube">
                        <Youtube className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {client.linkedin_url && (
                      <a href={client.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-md p-1 text-muted-foreground hover:text-blue-700 hover:bg-blue-700/10 transition-colors" title="LinkedIn">
                        <Linkedin className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {client.twitter_url && (
                      <a href={client.twitter_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="X (Twitter)">
                        <Twitter className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {client.website_url && (
                      <a href={client.website_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="rounded-md p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Website">
                        <Globe className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); copyClientUrl(client.slug); }}
                      className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Copiar link do portal"
                    >
                      <Copy className="h-3.5 w-3.5" />
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
                    {(isSuperAdmin || client.owner_id === currentUserId) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(client)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {(isSuperAdmin || client.owner_id === currentUserId) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(client.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {/* Share button - for client owners */}
                    {(isSuperAdmin || client.owner_id === currentUserId) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation();
                          setShareClientId(client.id);
                          // Fetch all admin/colaborador users to share with
                          const { data: profiles } = await supabase.from("profiles").select("id, full_name, email");
                          const { data: roles } = await supabase.from("user_roles").select("user_id, role");
                          const adminUsers = (profiles || []).filter(p => {
                            const userRole = (roles || []).find((r: any) => r.user_id === p.id);
                            return userRole && ["super_admin", "admin", "colaborador"].includes(userRole.role) && p.id !== currentUserId;
                          });
                          setAllAdmins(adminUsers);
                          // Fetch existing assignments for this client
                          const { data: existingAssignments } = await supabase
                            .from("user_client_assignments")
                            .select("user_id, client_id")
                            .eq("client_id", client.id);
                          const assigned = new Set((existingAssignments || []).map((a: any) => a.user_id));
                          setShareSelectedUsers(assigned);
                          setShareDialogOpen(true);
                        }}
                        title="Compartilhar cliente"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Create / Edit Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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
              <Label>Tipo de Cliente</Label>
              <Select value={clientType} onValueChange={setClientType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIENT_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
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

            {/* Login do cliente */}
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold">Login do Cliente</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {existingClientUser
                  ? "Atualize o e-mail ou senha do cliente"
                  : "Crie um acesso para o cliente visualizar seus conteúdos"}
              </p>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">E-mail do cliente</Label>
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="cliente@email.com"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    {existingClientUser ? "Nova senha (deixe vazio para manter)" : "Senha"}
                  </Label>
                  <Input
                    type="password"
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                    placeholder={existingClientUser ? "••••••••" : "Mínimo 6 caracteres"}
                  />
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
      <PostDetailDialog
        post={viewPost}
        open={viewPostOpen}
        onOpenChange={setViewPostOpen}
        tags={DEFAULT_TAGS}
        t={t}
        onUpdateLabel={async (postId, label, comment) => {
          try {
            await supabase.from("posts").update({ client_label: label }).eq("id", postId);
            if (comment) {
              const { data: { user } } = await supabase.auth.getUser();
              await supabase.from("comments").insert({ post_id: postId, author: user?.email || "Admin", text: comment });
            }
            if (viewPost && viewPost.id === postId) {
              setViewPost({ ...viewPost, clientLabel: label });
            }
            toast({ title: "Etiqueta atualizada com sucesso!" });
          } catch (err) {
            console.error("Error updating label:", err);
            toast({ title: "Erro ao atualizar etiqueta", variant: "destructive" });
          }
        }}
      />

      {/* Share Client Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Compartilhar Cliente
            </DialogTitle>
            <DialogDescription>
              Selecione os usuários que terão acesso a este cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {allAdmins.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum outro usuário disponível para compartilhar.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border p-3">
                {allAdmins.map(admin => (
                  <label key={admin.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shareSelectedUsers.has(admin.id)}
                      onChange={() => {
                        setShareSelectedUsers(prev => {
                          const next = new Set(prev);
                          if (next.has(admin.id)) next.delete(admin.id);
                          else next.add(admin.id);
                          return next;
                        });
                      }}
                      className="rounded border-border"
                    />
                    <div>
                      <p className="text-sm font-medium">{admin.full_name}</p>
                      <p className="text-xs text-muted-foreground">{admin.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <Button
              className="w-full"
              disabled={saving}
              onClick={async () => {
                if (!shareClientId) return;
                setSaving(true);
                try {
                  // Delete existing non-owner assignments
                  await supabase.from("user_client_assignments").delete()
                    .eq("client_id", shareClientId)
                    .neq("user_id", currentUserId || "");
                  
                  // Insert new assignments
                  if (shareSelectedUsers.size > 0) {
                    const { data: { session } } = await supabase.auth.getSession();
                    const newAssignments = Array.from(shareSelectedUsers)
                      .filter(uid => uid !== currentUserId)
                      .map(uid => ({
                        user_id: uid,
                        client_id: shareClientId,
                        assigned_by: session?.user?.id || null,
                      }));
                    if (newAssignments.length > 0) {
                      await supabase.from("user_client_assignments").insert(newAssignments as any);
                    }
                  }

                  // Mark as shared if others have access
                  const isShared = shareSelectedUsers.size > 0;
                  await supabase.from("clients").update({ shared: isShared } as any).eq("id", shareClientId);
                  setClients(prev => prev.map(c => c.id === shareClientId ? { ...c, shared: isShared } : c));

                  toast({ title: "Compartilhamento atualizado" });
                  setShareDialogOpen(false);
                } catch (err: any) {
                  toast({ title: "Erro", description: err.message, variant: "destructive" });
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Salvando..." : "Salvar compartilhamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminDashboard;
