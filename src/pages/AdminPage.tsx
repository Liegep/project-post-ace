import { useState } from "react";
import { usePosts } from "@/context/PostsContext";
import { PostStatus, STATUS_CONFIG } from "@/types/post";
import { PostCard } from "@/components/PostCard";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useI18n } from "@/i18n/I18nContext";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";

const COLUMNS: PostStatus[] = ["em_desenvolvimento", "escrevendo_legenda", "pronto"];

const STATUS_KEYS: Record<PostStatus, "statusInDevelopment" | "statusWritingCaption" | "statusReady"> = {
  em_desenvolvimento: "statusInDevelopment",
  escrevendo_legenda: "statusWritingCaption",
  pronto: "statusReady",
};

const AdminPage = () => {
  const { posts, updatePostStatus, deletePost } = usePosts();
  const { t } = useI18n();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("adminTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("adminSubtitle")}</p>
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
              />
            ))}
          </div>
        )}
      </main>

      <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default AdminPage;
