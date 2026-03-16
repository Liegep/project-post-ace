import { useState, useRef, useEffect } from "react";
import { usePosts } from "@/context/PostsContext";
import { Post, PostStatus, STATUS_CONFIG } from "@/types/post";
import { PostCard } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { EditPostDialog } from "@/components/EditPostDialog";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LayoutGrid, List, Pencil, ImagePlus } from "lucide-react";

const COLUMNS: PostStatus[] = ["entrada"];

const STATUS_KEYS: Record<PostStatus, "statusEntry" | "statusInDevelopment" | "statusWritingCaption" | "statusReady"> = {
  entrada: "statusEntry",
  em_desenvolvimento: "statusInDevelopment",
  escrevendo_legenda: "statusWritingCaption",
  pronto: "statusReady",
};

const AdminPage = () => {
  const { posts, updatePostStatus, deletePost, postingPeriod, setPostingPeriod, companyLogo, setCompanyLogo, uploadMedia } = usePosts();
  const { t } = useI18n();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [createOpen, setCreateOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [editingPeriod, setEditingPeriod] = useState(false);
  const [periodDraft, setPeriodDraft] = useState(postingPeriod);
  const periodInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadMedia(file);
      setCompanyLogo(url);
    } catch (err) {
      console.error("Logo upload failed", err);
    }
  };

  useEffect(() => {
    if (editingPeriod && periodInputRef.current) {
      periodInputRef.current.focus();
      periodInputRef.current.select();
    }
  }, [editingPeriod]);

  const savePeriod = () => {
    if (periodDraft.trim()) setPostingPeriod(periodDraft.trim());
    setEditingPeriod(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => logoInputRef.current?.click()}
              className="group relative flex h-10 w-10 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary overflow-hidden transition-colors"
            >
              {companyLogo ? (
                <>
                  <img src={companyLogo} alt="Logo" className="h-full w-full object-contain" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="h-4 w-4 text-white" />
                  </div>
                </>
              ) : (
                <ImagePlus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
              )}
            </button>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("adminTitle")}</h1>
              <p className="text-sm text-muted-foreground">{t("adminSubtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <div className="flex rounded-lg border bg-muted p-1">
              <button
                onClick={() => setView("kanban")}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${view === "kanban" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <Button onClick={() => setCreateOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> {t("newPost")}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        <div className="mb-8 flex items-center justify-center gap-2">
          {editingPeriod ? (
            <Input
              ref={periodInputRef}
              value={periodDraft}
              onChange={(e) => setPeriodDraft(e.target.value)}
              onBlur={savePeriod}
              onKeyDown={(e) => { if (e.key === "Enter") savePeriod(); if (e.key === "Escape") { setPeriodDraft(postingPeriod); setEditingPeriod(false); } }}
              placeholder={t("editPeriodPlaceholder")}
              className="max-w-xs text-center text-2xl font-bold border-accent"
            />
          ) : (
            <button
              onClick={() => { setPeriodDraft(postingPeriod); setEditingPeriod(true); }}
              className="group flex items-center gap-2 text-2xl font-bold text-foreground hover:text-accent transition-colors"
            >
              {postingPeriod}
              <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
            </button>
          )}
        </div>
        {view === "kanban" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {COLUMNS.map((status) => {
              const config = STATUS_CONFIG[status];
              const columnPosts = posts.filter((p) => p.status === status);
              return (
                <div key={status} className="rounded-xl border bg-card/50 p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${config.color}`}>
                      {t(STATUS_KEYS[status])}
                    </span>
                    <span className="text-sm text-muted-foreground">({columnPosts.length})</span>
                  </div>
                  <div className="space-y-3">
                    {columnPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        isAdmin
                        onStatusChange={(s) => updatePostStatus(post.id, s)}
                        onDelete={() => deletePost(post.id)}
                        onEdit={() => setEditPost(post)}
                      />
                    ))}
                    {columnPosts.length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">{t("noPosts")}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isAdmin
                onStatusChange={(s) => updatePostStatus(post.id, s)}
                onDelete={() => deletePost(post.id)}
                onEdit={() => setEditPost(post)}
              />
            ))}
          </div>
        )}
      </main>

      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditPostDialog post={editPost} open={!!editPost} onOpenChange={(open) => { if (!open) setEditPost(null); }} />
    </div>
  );
};

export default AdminPage;
