import { useState, useEffect, useCallback } from "react";
import ClientBriefs from "@/components/ClientBriefs";
import { UpcomingPostsWidget } from "@/components/UpcomingPostsWidget";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PostsProvider, usePosts } from "@/context/PostsContext";
import { Post } from "@/types/post";
import { PostCard } from "@/components/PostCard";
import { PostDetailDialog } from "@/components/PostDetailDialog";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { Locale, translations } from "@/i18n/translations";
import { I18nProvider } from "@/i18n/I18nContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Archive, LayoutGrid, RotateCcw, Plus, LogOut, KeyRound, Menu } from "lucide-react";
import { TrackingPanel } from "@/components/TrackingPanel";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ClientData {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  locale: string;
  posting_period: string;
  show_archived_to_client: boolean;
  allow_client_edit_caption: boolean;
  allow_client_create_post: boolean;
  tracking_enabled: boolean;
  tracking_visible_to_client: boolean;
}

const ClientPageInner = ({ clientData }: { clientData: ClientData }) => {
  const { posts, archivedPosts, columns, tags, postingPeriod, unarchivePost } = usePosts();
  const locale = (clientData.locale || "pt") as Locale;
  const t = useCallback(
    (key: keyof typeof translations.pt) => translations[locale]?.[key] || translations.pt[key] || key,
    [locale]
  );

  const [activeTab, setActiveTab] = useState<"board" | "archived">("board");
  const [createOpen, setCreateOpen] = useState(false);
  const [createInColumnId, setCreateInColumnId] = useState<string | null>(null);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const readyPosts = posts.filter((p) => p.status.includes("pronto"));

  const entradaColumn = columns.find((c) => c.name.toLowerCase() === "entrada");
  const entradaPosts = entradaColumn
    ? posts.filter((p) => p.columnId === entradaColumn.id && p.status.includes("em_desenvolvimento"))
    : [];

  // Columns explicitly visible to client (excluding entrada which has its own section)
  const visibleColumns = columns.filter((c) => c.visibleToClient && c.id !== entradaColumn?.id);
  const visibleColumnPosts = visibleColumns.map((col) => ({
    column: col,
    posts: posts.filter((p) => p.columnId === col.id),
  })).filter((g) => g.posts.length > 0);

  const sortByDate = (list: typeof posts) =>
    [...list].sort((a, b) => {
      const dateA = a.deadline ? new Date(a.deadline).getTime() : 0;
      const dateB = b.deadline ? new Date(b.deadline).getTime() : 0;
      return dateA - dateB;
    });

  const hasContent = readyPosts.length > 0 || entradaPosts.length > 0 || visibleColumnPosts.length > 0;

  const groupedArchived = archivedPosts.reduce<Record<string, typeof archivedPosts>>((acc, post) => {
    const date = post.archivedAt || post.createdAt;
    const key = format(date, "MMMM yyyy", { locale: ptBR });
    if (!acc[key]) acc[key] = [];
    acc[key].push(post);
    return acc;
  }, {});

  const archivedMonths = Object.keys(groupedArchived).sort((a, b) => {
    const dateA = groupedArchived[a][0].archivedAt || groupedArchived[a][0].createdAt;
    const dateB = groupedArchived[b][0].archivedAt || groupedArchived[b][0].createdAt;
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-5 sm:px-6 sm:py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            {clientData.logo_url && (
              <img
                src={clientData.logo_url}
                alt="Logo"
                className="h-20 w-20 rounded-xl object-contain shadow-sm border border-border sm:h-24 sm:w-24"
              />
            )}
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-extrabold text-foreground sm:text-4xl">{clientData.name}</h1>
              <p className="text-sm text-muted-foreground">{t("clientSubtitle")}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                Alterar senha
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Alterar senha</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="w-full"
                >
                  {savingPassword ? "Salvando..." : "Alterar senha"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="mx-auto max-w-full p-6">
        {postingPeriod && (
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-primary px-6 py-2 text-lg font-bold text-primary-foreground shadow-md">
              {postingPeriod}
            </span>
          </div>
        )}

        {/* Client Briefs for Approval */}
        <div className="mb-8">
          <ClientBriefs clientId={clientData.id} clientName={clientData.name} />
        </div>

        {/* Upcoming Posts Widget */}
        <div className="mb-8">
          <UpcomingPostsWidget posts={[...posts, ...archivedPosts]} />
        </div>

        {clientData.show_archived_to_client && (
          <div className="mb-6 flex items-center justify-center">
            <div className="flex rounded-lg border bg-muted p-1">
              <button
                onClick={() => setActiveTab("board")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "board" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <LayoutGrid className="mr-1.5 inline h-4 w-4" />
                {t("postsForApproval")}
              </button>
              <button
                onClick={() => setActiveTab("archived")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "archived" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <Archive className="mr-1.5 inline h-4 w-4" />
                Arquivados
                {archivedPosts.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-semibold">
                    {archivedPosts.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === "board" || !clientData.show_archived_to_client ? (
          <>
            {!clientData.show_archived_to_client && (
              <h2 className="mb-6 text-center text-3xl font-bold text-foreground">{t("postsForApproval")}</h2>
            )}

            {clientData.allow_client_create_post && (
              <div className="mb-4 flex justify-center">
                <Button
                  onClick={() => { setCreateInColumnId(null); setCreateOpen(true); }}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Criar post
                </Button>
              </div>
            )}


            <div className="flex flex-col lg:flex-row gap-6">
              {clientData.tracking_enabled && clientData.tracking_visible_to_client && (
                <TrackingPanel clientId={clientData.id} posts={posts} columns={columns} tags={tags} />
              )}

              <div className="flex-1 min-w-0 space-y-8">
                {hasContent ? (
                  <>
                    {/* Visible columns as horizontal board */}
                    {visibleColumnPosts.length > 0 && (
                      <div className="flex gap-4 overflow-x-auto pb-4">
                        {visibleColumnPosts.map(({ column, posts: colPosts }) => (
                          <div key={column.id} className="w-80 shrink-0 rounded-xl border bg-card/50 p-4">
                            <div className="mb-4 flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{column.name}</span>
                              <span className="text-xs text-muted-foreground">({colPosts.length})</span>
                            </div>
                            <div className="space-y-4">
                              {sortByDate(colPosts).map((post) => (
                                <div key={post.id} className="cursor-pointer" onClick={() => setDetailPost(post)}>
                                  <PostCard post={post} isAdmin={false} allowEditCaption={clientData.allow_client_edit_caption} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-6">
                      {entradaPosts.length > 0 && (
                        <div className="w-full lg:w-80 shrink-0">
                          <h3 className="mb-3 text-lg font-semibold text-muted-foreground">Entrada</h3>
                          <div className="space-y-4 rounded-xl bg-muted/30 p-4">
                            {sortByDate(entradaPosts).map((post) => (
                              <div key={post.id} className="cursor-pointer" onClick={() => setDetailPost(post)}>
                                <PostCard post={post} isAdmin={false} hideFeedback allowEditCaption={clientData.allow_client_edit_caption} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {readyPosts.length > 0 && (
                          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {sortByDate(readyPosts).map((post) => (
                              <div key={post.id} className="cursor-pointer" onClick={() => setDetailPost(post)}>
                                <PostCard post={post} isAdmin={false} allowEditCaption={clientData.allow_client_edit_caption} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="py-12 text-center text-muted-foreground">{t("noPostsToReview")}</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div>
            {archivedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 rounded-full bg-muted p-6">
                  <Archive className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Nenhum post arquivado</h2>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {archivedMonths.map((month) => (
                  <div key={month} className="w-80 shrink-0 rounded-xl border bg-card/50 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground capitalize">{month}</span>
                      <span className="text-xs text-muted-foreground">({groupedArchived[month].length})</span>
                    </div>
                    <div className="space-y-3">
                      {groupedArchived[month].map((post) => (
                        <div key={post.id} className="relative">
                          <PostCard post={post} isAdmin={false} hideFeedback />
                          {columns.length > 0 && (
                            <div className="mt-1.5">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-full text-xs">
                                    <RotateCcw className="mr-1.5 h-3 w-3" /> Restaurar
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="start">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">Mover para coluna:</p>
                                  <div className="space-y-1">
                                    {columns.map((col) => (
                                      <button
                                        key={col.id}
                                        onClick={() => unarchivePost(post.id, col.id, true)}
                                        className="w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                      >
                                        {col.name}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {clientData.allow_client_create_post && (
        <CreatePostDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultColumnId={createInColumnId}
          clientCreated
        />
      )}

      <PostDetailDialog
        post={detailPost}
        open={!!detailPost}
        onOpenChange={(v) => { if (!v) setDetailPost(null); }}
        tags={tags}
        t={t}
      />
    </div>
  );
};

const ClientPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    const load = async () => {
      // Load client data
      const { data } = await supabase.from("clients").select("*").eq("slug", slug).maybeSingle();
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Check if user is a client-role user — restrict to assigned client only
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: isClient } = await supabase.rpc("has_role" as any, {
          _user_id: session.user.id,
          _role: "client",
        });
        const { data: isAdmin } = await supabase.rpc("has_role" as any, {
          _user_id: session.user.id,
          _role: "admin",
        });
        const { data: isTeam } = await supabase.rpc("has_role" as any, {
          _user_id: session.user.id,
          _role: "team_member",
        });

        // Client-role users can only access their assigned client
        if (isClient && !isAdmin && !isTeam) {
          const { data: assignments } = await supabase
            .from("user_client_assignments")
            .select("client_id")
            .eq("user_id", session.user.id);
          
          const assignedIds = (assignments || []).map(a => a.client_id);
          if (!assignedIds.includes(data.id)) {
            setNotFound(true);
            setLoading(false);
            return;
          }
        }
      }

      setClientData(data as ClientData);
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !clientData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <h1 className="text-2xl font-bold text-foreground">Cliente não encontrado</h1>
        <p className="mt-2 text-muted-foreground">Verifique o link e tente novamente.</p>
      </div>
    );
  }

  const clientLocale = (clientData.locale || "pt") as Locale;

  return (
    <I18nProvider key={clientLocale} defaultLocale={clientLocale}>
      <PostsProvider clientId={clientData.id} clientLogo={clientData.logo_url} clientPostingPeriod={clientData.posting_period}>
        <ClientPageInner clientData={clientData} />
      </PostsProvider>
    </I18nProvider>
  );
};

export default ClientPage;
