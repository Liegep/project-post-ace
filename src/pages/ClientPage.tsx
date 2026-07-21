import { useState, useEffect, useCallback } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ContractGateModal } from "@/components/ContractGateModal";
import { useUserRole } from "@/hooks/useUserRole";
import { useMyBillingPermission } from "@/hooks/useBillingPermissions";
import { useNavigate } from "react-router-dom";
import ClientBriefs from "@/components/ClientBriefs";
import { ClientInvoicesPanel } from "@/components/billing/ClientInvoicesPanel";
import ClientDesignBriefs from "@/components/briefs/ClientDesignBriefs";
import ClientBriefAssignments from "@/components/briefs/ClientBriefAssignments";
import { TextContentsPanel } from "@/components/TextContentsPanel";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PostsProvider, usePosts } from "@/context/PostsContext";
import { Post } from "@/types/post";
import { PostCard } from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import { PostCardDialog } from "@/components/PostCardDialog";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { Locale, translations } from "@/i18n/translations";
import { I18nProvider } from "@/i18n/I18nContext";
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from "date-fns";
import { ptBR, it, enUS, es, sv } from "date-fns/locale";
import { Archive, LayoutGrid, RotateCcw, Plus, LogOut, KeyRound, Menu, FileBarChart, ArrowRight, ChevronLeft, ChevronRight as ChevronRightIcon, Sparkles } from "lucide-react";
import { ClientNewsWidget } from "@/components/ClientNewsWidget";
import { UpcomingPostsWidget } from "@/components/UpcomingPostsWidget";
import { TrackingDrawer } from "@/components/TrackingDrawer";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSocialReports, METRIC_LABELS } from "@/hooks/useSocialReports";
import { KanbanScrollWrapper } from "@/components/KanbanScrollWrapper";

interface ClientData {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  locale: string;
  posting_period: string;
  show_archived_to_client: boolean;
  show_invoices_to_client: boolean;
  allow_client_edit_caption: boolean;
  allow_client_create_post: boolean;
  allow_client_download: boolean;
  allow_client_create_tags: boolean;
  tracking_enabled: boolean;
  tracking_visible_to_client: boolean;
  show_upcoming_posts: boolean;
  client_portal_title: string;
}

const POSTS_PER_PAGE = 6;

const ClientPageInner = ({ clientData }: { clientData: ClientData }) => {
  const { posts, archivedPosts, columns, tags, postingPeriod, unarchivePost, updateClientLabel, addComment, loading: postsLoading } = usePosts();
  const navigate = useNavigate();
  const { data: reports = [] } = useSocialReports(clientData.id);
  const { permission: billingPerm, loading: billingPermLoading } = useMyBillingPermission(clientData.id);
  const locale = (clientData.locale || "pt") as Locale;
  const t = useCallback(
    (key: keyof typeof translations.pt) => translations[locale]?.[key] || translations.pt[key] || key,
    [locale]
  );

  const userName = clientData.name || "";


  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("goodMorning");
    if (hour < 18) return t("goodAfternoon");
    return t("goodEvening");
  };

  const [activeTab, setActiveTab] = useState<"board" | "archived">("board");
  const [createOpen, setCreateOpen] = useState(false);
  const [createInColumnId, setCreateInColumnId] = useState<string | null>(null);
  const [detailPost, setDetailPost] = useState<Post | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [visibleCount, setVisibleCount] = useState(POSTS_PER_PAGE);
  const [assignmentCount, setAssignmentCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("user_client_assignments").select("client_id").eq("user_id", session.user.id);
      setAssignmentCount((data || []).length);
    })();
  }, []);

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  // Reset visible count when month changes
  useEffect(() => {
    setVisibleCount(POSTS_PER_PAGE);
  }, [selectedMonth]);

  // Filter posts by selected month (using deadline or createdAt)
  const filterByMonth = useCallback((post: Post) => {
    const date = post.deadline || post.createdAt;
    return date >= monthStart && date <= monthEnd;
  }, [monthStart, monthEnd]);

  // Filter reports by selected month
  const filteredReports = reports.filter((r) => {
    const start = new Date(r.period_start);
    const end = new Date(r.period_end);
    return (start <= monthEnd && end >= monthStart);
  });

  // Track which items the client has already seen
  const [seenItemIds, setSeenItemIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const fetchSeen = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from("client_seen_items")
        .select("item_type, item_id")
        .eq("user_id", session.user.id);
      setSeenItemIds(new Set((data || []).map((s: any) => `${s.item_type}:${s.item_id}`)));
    };
    fetchSeen();
  }, []);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t("passwordMinError"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(t("passwordUpdateError") + ": " + error.message);
    } else {
      toast.success(t("passwordUpdated"));
      setPasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const readyPosts = posts.filter((p) => p.status.includes("pronto") && p.clientLabel !== "aprovado");

  const entradaColumn = columns.find((c) => c.name.toLowerCase() === "entrada");
  const entradaPosts = entradaColumn
    ? posts.filter((p) => p.columnId === entradaColumn.id && p.status.includes("em_desenvolvimento"))
    : [];

  // Columns explicitly visible to client (excluding entrada which has its own section)
  const visibleColumns = columns.filter((c) => c.visibleToClient && c.id !== entradaColumn?.id);
  const visibleColumnPosts = visibleColumns.map((col) => ({
    column: col,
    posts: posts.filter((p) => p.columnId === col.id),
  }));

  const sortByDate = (list: typeof posts) =>
    [...list].sort((a, b) => {
      // Posts with "alterado" tag go first
      const aAlterado = a.tags.includes("alterado") ? 1 : 0;
      const bAlterado = b.tags.includes("alterado") ? 1 : 0;
      if (aAlterado !== bAlterado) return bAlterado - aAlterado;
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
              <DropdownMenuItem onClick={() => navigate(`/client/${clientData.slug}/brand-brain`)}>
                <Sparkles className="mr-2 h-4 w-4" />
                {t("brandBrain")}
              </DropdownMenuItem>
              {assignmentCount > 1 && (
                <DropdownMenuItem onClick={() => navigate("/select-client")}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  {t("switchAccount")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                {t("changePassword")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/login";
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{t("changePassword")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t("newPassword")}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("minChars")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t("confirmNewPassword")}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("repeatPassword")}
                  />
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="w-full"
                >
                  {savingPassword ? t("saving") : t("saveNewPassword")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="mx-auto max-w-full p-6">
        {/* Greeting */}
        <div className="mb-6 rounded-xl border bg-card px-5 py-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            {getGreeting()}{userName ? `, ${userName.split(" ")[0]}` : ""} 👋
          </h2>
        </div>

        {/* Month Selector */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
          >
            <ChevronLeft className="h-4 w-4 text-primary-foreground" />
          </Button>
          <button
            onClick={() => setSelectedMonth(new Date())}
            className="rounded-lg bg-muted px-4 py-1.5 text-sm font-semibold text-foreground capitalize hover:bg-muted/80 transition-colors"
          >
            {format(selectedMonth, "MMMM yyyy", { locale: { pt: ptBR, it, en: enUS, es, sv }[locale] || ptBR })}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
            disabled={isCurrentMonth}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          {!isCurrentMonth && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs ml-1"
              onClick={() => setSelectedMonth(new Date())}
            >
              {t("currentMonth")}
            </Button>
          )}
        </div>

        {/* News Widget - unseen invoices & reports */}
        <ClientNewsWidget clientId={clientData.id} showInvoices={clientData.show_invoices_to_client && !!billingPerm?.can_view_invoices} locale={clientData.locale} />

        {/* Client Briefs for Approval */}
        <div className="mb-8">
          <ClientBriefs clientId={clientData.id} clientName={clientData.name} filterMonth={selectedMonth} locale={clientData.locale} />
        </div>

        {/* Design Briefs */}
        <div className="mb-8">
          <ClientDesignBriefs clientId={clientData.id} />
        </div>

        {/* Brief Assignments (templates enviados) */}
        <div className="mb-8">
          <ClientBriefAssignments clientId={clientData.id} locale={clientData.locale} />
        </div>

        {/* Text Contents for Approval */}
        <div className="mb-8">
          <TextContentsPanel clientId={clientData.id} clientName={clientData.name} locale={clientData.locale} />
        </div>

        {/* Client Invoices - permission-controlled */}
        {clientData.show_invoices_to_client && billingPerm?.can_view_invoices && (
          <div className="mb-8">
            <ClientInvoicesPanel
              clientId={clientData.id}
              unseenIds={seenItemIds}
              canDownloadInvoices={billingPerm.can_download_invoices}
              canViewAttachments={billingPerm.can_view_attachments}
              canDownloadAttachments={billingPerm.can_download_attachments}
              filterMonth={selectedMonth}
              locale={clientData.locale}
            />
          </div>
        )}

        {/* Reports list moved into the unified Novidades widget above */}


        {clientData.show_archived_to_client && (
          <div className="mb-6 flex items-center justify-center">
            <div className="flex rounded-lg border bg-muted p-1">
              <button
                onClick={() => setActiveTab("board")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "board" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <LayoutGrid className="mr-1.5 inline h-4 w-4" />
                {clientData.client_portal_title || t("postsForApproval")}
              </button>
              <button
                onClick={() => setActiveTab("archived")}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === "archived" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <Archive className="mr-1.5 inline h-4 w-4" />
                {t("archived")}
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
              <h2 className="mb-6 text-center text-3xl font-bold text-foreground">{clientData.client_portal_title || t("postsForApproval")}</h2>
            )}

            {clientData.allow_client_create_post && (
              <div className="mb-4 flex justify-center">
                <Button
                  onClick={() => { setCreateInColumnId(null); setCreateOpen(true); }}
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t("createPost")}
                </Button>
              </div>
            )}


            {clientData.tracking_enabled && clientData.tracking_visible_to_client && (
              <TrackingDrawer
                clientId={clientData.id}
                posts={posts}
                columns={columns}
                tags={tags}
                trackingColumnIds={((clientData as any).tracking_column_ids as string[]) ?? []}
                locale={clientData.locale}
              />
            )}

              <div className="flex-1 min-w-0 space-y-8 overflow-x-hidden">
                {postsLoading ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <PostCardSkeleton key={i} />
                    ))}
                  </div>
                ) : hasContent ? (
                  <>
                    {/* Visible columns as horizontal board */}
                    {visibleColumnPosts.length > 0 && (
                      <div className="-mx-6 px-6">
                        <KanbanScrollWrapper>
                          {visibleColumnPosts.map(({ column, posts: colPosts }) => {
                            const headerBg = column.color || "#000000";
                            const m = headerBg.replace("#", "");
                            const valid = /^[0-9a-fA-F]{6}$/.test(m);
                            const r = valid ? parseInt(m.slice(0, 2), 16) : 0;
                            const g = valid ? parseInt(m.slice(2, 4), 16) : 0;
                            const b = valid ? parseInt(m.slice(4, 6), 16) : 0;
                            const luminance = valid ? (0.299 * r + 0.587 * g + 0.114 * b) / 255 : 0;
                            const isLight = luminance > 0.6;
                            const textColor = isLight ? "#111827" : "#ffffff";
                            const mutedColor = isLight ? "rgba(17,24,39,0.65)" : "rgba(255,255,255,0.75)";
                            return (
                              <div key={column.id} className="w-80 shrink-0 rounded-xl border bg-card/50 p-4">
                                <div
                                  className="mb-4 flex items-center gap-2 rounded-lg backdrop-blur-sm border border-l-4 px-3 py-2 shadow-sm"
                                  style={{
                                    backgroundColor: headerBg,
                                    borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                                    borderLeftColor: column.color || (isLight ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)"),
                                    color: textColor,
                                  }}
                                >
                                  <span
                                    className="h-2.5 w-2.5 rounded-full shrink-0 ring-1"
                                    style={{
                                      backgroundColor: column.color || "transparent",
                                      borderColor: isLight ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.4)",
                                      boxShadow: isLight ? "inset 0 0 0 1px rgba(0,0,0,0.15)" : "inset 0 0 0 1px rgba(255,255,255,0.35)",
                                    }}
                                  />
                                  <span className="text-sm font-semibold break-words whitespace-normal" style={{ color: textColor }}>{column.name}</span>
                                  <span className="text-xs ml-auto" style={{ color: mutedColor }}>({colPosts.length})</span>
                                </div>
                                <div className="space-y-4">
                                  {sortByDate(colPosts).map((post) => (
                                     <ErrorBoundary key={post.id} fallbackTitle={t("errorDisplayingPost")}>
                                      <PostCard post={post} isAdmin={false} onEdit={() => setDetailPost(post)} allowEditCaption={clientData.allow_client_edit_caption} allowClientDownload={clientData.allow_client_download} />
                                    </ErrorBoundary>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          {/* Spacer to prevent last column from being clipped */}
                          <div className="shrink-0 w-1" aria-hidden="true" />
                        </KanbanScrollWrapper>
                      </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-6">
                      {entradaPosts.length > 0 && (
                        <div className="w-full lg:w-80 shrink-0">
                          <h3 className="mb-3 text-lg font-semibold text-muted-foreground">{t("statusEntry")}</h3>
                          <div className="space-y-4 rounded-xl bg-muted/30 p-4">
                            {sortByDate(entradaPosts).map((post) => (
                              <ErrorBoundary key={post.id} fallbackTitle={t("errorDisplayingPost")}>
                                <PostCard post={post} isAdmin={false} onEdit={() => setDetailPost(post)} hideFeedback allowEditCaption={clientData.allow_client_edit_caption} allowClientDownload={clientData.allow_client_download} />
                              </ErrorBoundary>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        {readyPosts.length > 0 && (
                          <>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                              {sortByDate(readyPosts).slice(0, visibleCount).map((post) => (
                                <ErrorBoundary key={post.id} fallbackTitle={t("errorDisplayingPost")}>
                                  <PostCard post={post} isAdmin={false} onEdit={() => setDetailPost(post)} allowEditCaption={clientData.allow_client_edit_caption} allowClientDownload={clientData.allow_client_download} showInlineDetails={visibleColumnPosts.length === 0} />
                                </ErrorBoundary>
                              ))}
                            </div>
                            {visibleCount < readyPosts.length && (
                              <div className="mt-6 flex justify-center">
                                <Button
                                  variant="outline"
                                  onClick={() => setVisibleCount((prev) => prev + POSTS_PER_PAGE)}
                                  className="px-8"
                                >
                                  {t("loadMore")} ({readyPosts.length - visibleCount} {t("loadMoreRemaining")})
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="py-12 text-center text-muted-foreground">{t("noPostsToReview")}</p>
                )}
              </div>
          </>
        ) : (
          <div className="h-[calc(100vh-600px)] min-h-[300px] overflow-hidden">
            {archivedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 rounded-full bg-muted p-6">
                  <Archive className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{t("noArchivedPosts")}</h2>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 h-full">
                {archivedMonths.map((month) => (
                  <div key={month} className="w-80 shrink-0 rounded-xl border bg-card/50 p-4 flex flex-col h-full">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground capitalize">{month}</span>
                      <span className="text-xs text-muted-foreground">({groupedArchived[month].length})</span>
                    </div>
                    <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
                      {groupedArchived[month].map((post) => (
                        <div key={post.id} className="relative">
                          <PostCard post={post} isAdmin={false} onEdit={() => setDetailPost(post)} hideFeedback allowEditCaption={clientData.allow_client_edit_caption} allowClientDownload={clientData.allow_client_download} />
                          {columns.length > 0 && (
                            <div className="mt-1.5">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-full text-xs">
                                    <RotateCcw className="mr-1.5 h-3 w-3" /> {t("restore")}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="start">
                                  <p className="text-xs font-medium text-muted-foreground mb-2">{t("moveToColumn")}:</p>
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

      <PostCardDialog
        post={detailPost}
        open={!!detailPost}
        onOpenChange={(v) => { if (!v) setDetailPost(null); }}
        isAdmin={false}
        allowEditCaption={clientData.allow_client_edit_caption}
        allowClientDownload={clientData.allow_client_download}
        allowClientCreateTags={clientData.allow_client_create_tags}
      />
    </div>
  );
};

const ClientPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { isClient } = useUserRole();
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
    const fallbackLocale = (clientData?.locale || "pt") as Locale;
    const tt = (key: keyof typeof translations.pt) => translations[fallbackLocale]?.[key] || translations.pt[key];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <h1 className="text-2xl font-bold text-foreground">{tt("clientNotFound")}</h1>
        <p className="mt-2 text-muted-foreground">{tt("clientNotFoundDesc")}</p>
      </div>
    );
  }


  const clientLocale = (clientData.locale || "pt") as Locale;
  const tOuter = (key: keyof typeof translations.pt) => translations[clientLocale]?.[key] || translations.pt[key];

  return (
    <ErrorBoundary fallbackTitle={tOuter("errorLoadingClientPage")}>
      {isClient && <ContractGateModal />}
      <I18nProvider key={clientLocale} forceLocale={clientLocale}>
        <PostsProvider clientId={clientData.id} clientLogo={clientData.logo_url} clientPostingPeriod={clientData.posting_period}>
          <ClientPageInner clientData={clientData} />
        </PostsProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
};

export default ClientPage;
