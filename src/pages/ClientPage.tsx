import { usePosts } from "@/context/PostsContext";
import { useI18n } from "@/i18n/I18nContext";
import { PostCard } from "@/components/PostCard";

const ClientPage = () => {
  const { posts, postingPeriod, companyLogo } = usePosts();
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          {companyLogo && (
            <img src={companyLogo} alt="Logo" className="h-10 w-10 rounded-lg object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t("clientTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("clientSubtitle")}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        <h2 className="mb-2 text-center text-2xl font-bold text-foreground">{postingPeriod}</h2>
        <p className="mb-6 text-center text-sm text-muted-foreground">{t("postsForApproval")}</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {posts.length === 0 && (
            <p className="col-span-full py-12 text-center text-muted-foreground">{t("noPostsToReview")}</p>
          )}
          {posts.map((post) => (
            <PostCard key={post.id} post={post} isAdmin={false} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default ClientPage;
