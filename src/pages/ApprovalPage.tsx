import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LazyImage, LazyVideo } from "@/components/LazyImage";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, MessageSquare, AlertTriangle, Lock, ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ApprovalPost {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  media_type: string;
  media_urls: string[];
  client_label: string;
  tags: string[];
}

interface TokenData {
  id: string;
  client_id: string;
  post_id: string | null;
  token_type: string;
  expires_at: string | null;
  active: boolean;
}

const ApprovalPage = () => {
  const { token } = useParams<{ token: string }>();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [posts, setPosts] = useState<ApprovalPost[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientLogo, setClientLogo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actorName, setActorName] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState<Record<string, string>>({});
  const [mediaIndexes, setMediaIndexes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (token) loadTokenData();
  }, [token]);

  const loadTokenData = async () => {
    setLoading(true);
    try {
      const { data: td, error: tokenErr } = await supabase
        .from("approval_tokens")
        .select("*")
        .eq("token", token)
        .eq("active", true)
        .maybeSingle();

      if (tokenErr || !td) {
        setError("Link inválido ou expirado.");
        setLoading(false);
        return;
      }

      if (td.expires_at && new Date(td.expires_at) < new Date()) {
        setError("Este link de aprovação expirou.");
        setLoading(false);
        return;
      }

      setTokenData(td as TokenData);

      // Load client info
      const { data: client } = await supabase
        .from("clients")
        .select("name, logo_url")
        .eq("id", td.client_id)
        .maybeSingle();

      if (client) {
        setClientName(client.name);
        setClientLogo(client.logo_url || "");
      }

      // Load posts
      let postsQuery = supabase.from("posts").select("id, title, caption, image_url, media_type, media_urls, client_label, tags");

      if (td.token_type === "individual" && td.post_id) {
        postsQuery = postsQuery.eq("id", td.post_id);
      } else {
        // Batch: load all visible posts for client
        postsQuery = postsQuery
          .eq("client_id", td.client_id)
          .eq("archived", false)
          .in("client_label", ["pendente", "de_seu_feedback"]);
      }

      const { data: postsData } = await postsQuery;
      setPosts((postsData as ApprovalPost[]) || []);

      // Load existing actions for this token
      const { data: actions } = await supabase
        .from("approval_actions")
        .select("post_id, action")
        .eq("token_id", td.id);

      if (actions) {
        const comp: Record<string, string> = {};
        actions.forEach(a => { comp[a.post_id] = a.action; });
        setCompleted(comp);
      }
    } catch {
      setError("Erro ao carregar dados.");
    }
    setLoading(false);
  };

  const handleAction = async (postId: string, action: "aprovado" | "alteracao_solicitada") => {
    if (!tokenData) return;
    setSubmitting(prev => ({ ...prev, [postId]: true }));

    try {
      // Insert action record
      await supabase.from("approval_actions").insert({
        token_id: tokenData.id,
        post_id: postId,
        action,
        comment: comments[postId] || "",
        actor_name: actorName || "Cliente (via link)",
      });

      // Update client_label on the post
      await supabase.from("posts").update({ client_label: action }).eq("id", postId);

      // If there's a comment, add it
      if (comments[postId]?.trim()) {
        await supabase.from("comments").insert({
          post_id: postId,
          author: actorName || "Cliente (via link)",
          text: comments[postId].trim(),
        });
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        action: action === "aprovado" ? "approve" : "request_change",
        item_type: "post",
        item_id: postId,
        item_title: posts.find(p => p.id === postId)?.title || "",
        client_id: tokenData.client_id,
        client_name: clientName,
        user_name: actorName || "Cliente (via link)",
        metadata: { via: "approval_link", token_id: tokenData.id },
      });

      setCompleted(prev => ({ ...prev, [postId]: action }));
      toast.success(action === "aprovado" ? "Post aprovado!" : "Ajuste solicitado!");
    } catch {
      toast.error("Erro ao processar ação.");
    }
    setSubmitting(prev => ({ ...prev, [postId]: false }));
  };

  const getMediaIndex = (postId: string) => mediaIndexes[postId] || 0;
  const setMediaIndex = (postId: string, idx: number) =>
    setMediaIndexes(prev => ({ ...prev, [postId]: idx }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-bold text-foreground">{error}</h1>
          <p className="text-sm text-muted-foreground">
            Se você acredita que isso é um erro, entre em contato com a equipe responsável.
          </p>
          <Button variant="outline" onClick={() => window.location.href = "/login"}>
            Fazer login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            {clientLogo && (
              <img src={clientLogo} alt={clientName} className="h-8 w-8 rounded-full object-cover" />
            )}
            <div>
              <h1 className="font-semibold text-foreground">{clientName}</h1>
              <p className="text-xs text-muted-foreground">Aprovação de conteúdo</p>
            </div>
            {posts.length > 1 && (
              <Badge variant="secondary" className="ml-auto">
                {Object.keys(completed).length}/{posts.length} revisados
              </Badge>
            )}
          </div>
        </header>

        {/* Actor name input */}
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-2 mb-4">
            <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Seu nome:</label>
            <input
              type="text"
              value={actorName}
              onChange={e => setActorName(e.target.value)}
              placeholder="Digite seu nome (opcional)"
              className="flex-1 h-8 rounded-md border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Posts */}
        <div className="max-w-3xl mx-auto px-4 pb-12 space-y-6">
          {posts.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-foreground">Nenhum post pendente</h2>
              <p className="text-sm text-muted-foreground">Todos os posts já foram revisados.</p>
            </Card>
          ) : (
            posts.map(post => {
              const isCompleted = !!completed[post.id];
              const idx = getMediaIndex(post.id);
              const urls = post.media_urls?.length > 0 ? post.media_urls : post.image_url ? [post.image_url] : [];

              return (
                <Card key={post.id} className={`overflow-hidden transition-all ${isCompleted ? "opacity-75 ring-2 ring-success/30" : ""}`}>
                  {/* Media */}
                  {urls.length > 0 && (
                    <div className="relative bg-muted">
                      {post.media_type === "video" ? (
                        <video
                          src={urls[idx]}
                          controls
                          className="w-full max-h-[500px] object-contain"
                        />
                      ) : (
                        <img
                          src={urls[idx]}
                          alt={post.title}
                          className="w-full max-h-[500px] object-contain"
                        />
                      )}
                      {urls.length > 1 && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-7 w-7 rounded-full bg-background/90 backdrop-blur shadow-md border border-border hover:bg-background"
                            disabled={idx === 0}
                            onClick={() => setMediaIndex(post.id, idx - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="bg-background/90 backdrop-blur rounded-full px-2 py-0.5 text-xs font-medium text-foreground shadow-md border border-border">
                            {idx + 1}/{urls.length}
                          </span>
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-7 w-7 rounded-full bg-background/90 backdrop-blur shadow-md border border-border hover:bg-background"
                            disabled={idx === urls.length - 1}
                            onClick={() => setMediaIndex(post.id, idx + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-semibold text-foreground">{post.title}</h3>
                    {post.caption && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap select-all">{post.caption}</p>
                    )}

                    {isCompleted ? (
                      <div className={`flex items-center gap-2 rounded-lg p-3 ${
                        completed[post.id] === "aprovado"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }`}>
                        {completed[post.id] === "aprovado" ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5" />
                        )}
                        <span className="text-sm font-medium">
                          {completed[post.id] === "aprovado" ? "Aprovado" : "Ajuste solicitado"}
                        </span>
                      </div>
                    ) : (
                      <>
                        <Textarea
                          placeholder="Deixe um comentário (opcional)..."
                          value={comments[post.id] || ""}
                          onChange={e => setComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                          className="resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            onClick={() => handleAction(post.id, "aprovado")}
                            disabled={submitting[post.id]}
                          >
                            {submitting[post.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Check className="h-4 w-4 mr-1" />
                            )}
                            Aprovar
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleAction(post.id, "alteracao_solicitada")}
                            disabled={submitting[post.id]}
                          >
                            {submitting[post.id] ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <MessageSquare className="h-4 w-4 mr-1" />
                            )}
                            Solicitar ajuste
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default ApprovalPage;
