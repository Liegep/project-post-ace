import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PostsProvider, usePosts } from "@/context/PostsContext";
import { PostCard } from "@/components/PostCard";
import { Locale, translations } from "@/i18n/translations";
import { I18nProvider } from "@/i18n/I18nContext";

interface ClientData {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  locale: string;
  posting_period: string;
}

const ClientPageInner = ({ clientData }: { clientData: ClientData }) => {
  const { posts, postingPeriod } = usePosts();
  const locale = (clientData.locale || "pt") as Locale;
  const t = useCallback(
    (key: keyof typeof translations.pt) => translations[locale]?.[key] || translations.pt[key] || key,
    [locale]
  );

  const sortByDate = (list: typeof posts) =>
    [...list].sort((a, b) => {
      const dateA = a.deadline ? new Date(a.deadline).getTime() : 0;
      const dateB = b.deadline ? new Date(b.deadline).getTime() : 0;
      return dateA - dateB;
    });

  const entradaPosts = sortByDate(posts.filter((p) => p.status === "entrada"));
  const otherPosts = sortByDate(posts.filter((p) => p.status !== "entrada"));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          {clientData.logo_url && (
            <img src={clientData.logo_url} alt="Logo" className="h-[250px] w-[250px] rounded-lg object-contain" />
          )}
          <div>
            <h1 className="text-4xl font-extrabold text-foreground">{clientData.name}</h1>
            <p className="text-sm text-muted-foreground">{t("clientSubtitle")}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        {postingPeriod && (
          <div className="mb-4 flex justify-center">
            <span className="rounded-full bg-primary px-6 py-2 text-lg font-bold text-primary-foreground shadow-md">
              {postingPeriod}
            </span>
          </div>
        )}
        <h2 className="mb-2 text-center text-3xl font-bold text-foreground">{t("postsForApproval")}</h2>
        {postingPeriod && (
          <p className="mb-6 text-center text-lg font-medium text-muted-foreground">{postingPeriod}</p>
        )}

        {posts.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">{t("noPostsToReview")}</p>
        )}

        {entradaPosts.length > 0 && (
          <div className="mb-8 rounded-xl bg-muted/50 p-6">
            <h3 className="mb-4 text-xl font-semibold text-muted-foreground">Posts para fazer</h3>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {entradaPosts.map((post) => (
                <PostCard key={post.id} post={post} isAdmin={false} hideFeedback />
              ))}
            </div>
          </div>
        )}

        {otherPosts.length > 0 && (
          <div>
            {entradaPosts.length > 0 && (
              <h3 className="mb-4 text-xl font-semibold text-muted-foreground">{t("postsForApproval")}</h3>
            )}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {otherPosts.map((post) => (
                <PostCard key={post.id} post={post} isAdmin={false} />
              ))}
            </div>
          </div>
        )}
      </main>
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
      const { data } = await supabase.from("clients").select("*").eq("slug", slug).maybeSingle();
      if (!data) {
        setNotFound(true);
      } else {
        setClientData(data as ClientData);
      }
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
