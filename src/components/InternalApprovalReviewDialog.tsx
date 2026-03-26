import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { LinkedText } from "@/components/LinkedText";

interface InternalApprovalReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

interface PostData {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  media_urls: string[];
  media_type: string;
  deadline: string | null;
  status: string[];
  client_label: string;
}

export function InternalApprovalReviewDialog({ open, onOpenChange, postId }: InternalApprovalReviewDialogProps) {
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !postId) return;
    setMediaIndex(0);
    setShowChangeForm(false);
    setComment("");
    loadPost();
  }, [open, postId]);

  const loadPost = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("id, title, caption, image_url, media_urls, media_type, deadline, status, client_label")
      .eq("id", postId)
      .maybeSingle();
    setPost(data as PostData | null);
    setLoading(false);
  };

  const handleAction = async (action: "approved" | "rejected") => {
    if (!post) return;
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    // Update internal_approvals status
    const { error } = await supabase
      .from("internal_approvals" as any)
      .update({
        status: action,
        comment: comment.trim() || (action === "approved" ? "Aprovado" : ""),
        responded_at: new Date().toISOString(),
      } as any)
      .eq("post_id", postId)
      .eq("assigned_to", user.id)
      .eq("status", "pending");

    if (error) {
      toast.error("Erro ao enviar resposta");
      setSubmitting(false);
      return;
    }

    // Notify the requester
    const { data: approval } = await supabase
      .from("internal_approvals" as any)
      .select("requested_by, client_id")
      .eq("post_id", postId)
      .eq("assigned_to", user.id)
      .maybeSingle();

    if (approval) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      await supabase.from("admin_notifications").insert({
        user_id: (approval as any).requested_by,
        client_id: (approval as any).client_id,
        post_id: postId,
        type: "internal_approval",
        title: action === "approved" ? "Post aprovado internamente" : "Alteração solicitada",
        message: `${profile?.full_name || "Usuário"} ${action === "approved" ? "aprovou" : "solicitou alteração em"} "${post.title}".${comment.trim() ? ` Comentário: ${comment.trim()}` : ""}`,
        actor_avatar_url: profile?.avatar_url || "",
      });
    }

    toast.success(action === "approved" ? "Post aprovado!" : "Alteração solicitada!");
    setSubmitting(false);
    onOpenChange(false);
  };

  const allMedia = post ? (post.media_urls?.length > 0 ? post.media_urls : post.image_url ? [post.image_url] : []) : [];
  const hasMedia = allMedia.length > 0;
  const currentUrl = allMedia[mediaIndex] || allMedia[0];
  const isVideo = currentUrl?.match(/\.(mp4|webm|mov|avi)/i) || post?.media_type === "video";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !post ? (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            Post não encontrado
          </div>
        ) : (
          <>
            {/* Media */}
            {hasMedia && (
              <div className="relative w-full bg-black" style={{ aspectRatio: "4/5", maxHeight: "60vh" }}>
                {isVideo ? (
                  <video src={currentUrl} className="h-full w-full object-contain" controls />
                ) : (
                  <img src={currentUrl} alt={post.title} className="h-full w-full object-contain" />
                )}
                {allMedia.length > 1 && (
                  <>
                    <button
                      onClick={() => setMediaIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 hover:bg-background shadow-md"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setMediaIndex((prev) => (prev + 1) % allMedia.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 hover:bg-background shadow-md"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {allMedia.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setMediaIndex(i)}
                          className={`h-2 w-2 rounded-full transition-colors ${i === mediaIndex ? "bg-white" : "bg-white/40"}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-5 space-y-4">
              <div>
                <Badge variant="outline" className="mb-2 text-xs bg-primary/10 text-primary border-primary/20">
                  Aprovação Interna
                </Badge>
                <h2 className="text-xl font-bold text-foreground">{post.title}</h2>
              </div>

              {post.deadline && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Previsão: {format(new Date(post.deadline), "dd/MM/yyyy")}</span>
                </div>
              )}

              {post.caption && (
                <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  <LinkedText text={post.caption} />
                </div>
              )}

              {/* Action area */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium text-foreground">O que achou deste post?</p>

                <Textarea
                  placeholder="Adicione um comentário (opcional)..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[80px] text-sm"
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
                    disabled={submitting}
                    onClick={() => handleAction("approved")}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    disabled={submitting}
                    onClick={() => handleAction("rejected")}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                    Solicitar Alteração
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
