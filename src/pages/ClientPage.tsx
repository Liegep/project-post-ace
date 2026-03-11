import { usePosts } from "@/context/PostsContext";
import { LABEL_CONFIG, STATUS_CONFIG } from "@/types/post";
import { PostCard } from "@/components/PostCard";

const ClientPage = () => {
  const { posts } = usePosts();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-foreground">Portal do Cliente</h1>
          <p className="text-sm text-muted-foreground">Visualize e aprove seus conteúdos</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6">
        <div className="space-y-4">
          {posts.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">Nenhum post para revisar no momento.</p>
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
