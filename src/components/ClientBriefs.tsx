import { useState, useEffect, useMemo } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { CalendarIcon, Check, X, MessageCircle, FileText, Send, Lightbulb, PencilLine } from "lucide-react";

// Padrão "papel pautado" para reforçar que é um rascunho/ideia
const NOTEBOOK_BG: React.CSSProperties = {
  backgroundColor: "#fffaf0",
};

type BriefStatus = "draft" | "internal" | "pending_approval" | "approved" | "rejected" | "published";

interface Brief {
  id: string;
  client_id: string;
  title: string;
  description: string;
  caption: string;
  planned_date: string | null;
  content_type: string;
  status: BriefStatus;
  created_at: string;
  updated_at: string;
  media_urls?: string[];
}

interface BriefComment {
  id: string;
  brief_id: string;
  user_id: string;
  author_name: string;
  author_role: string;
  message: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending_approval: { label: "Aguardando Aprovação", color: "bg-amber-500/15 text-amber-600" },
  approved: { label: "Aprovado", color: "bg-emerald-500/15 text-emerald-600" },
  rejected: { label: "Reprovado", color: "bg-red-500/15 text-red-600" },
  published: { label: "Publicado", color: "bg-purple-500/15 text-purple-600" },
};

const CONTENT_LABELS: Record<string, string> = {
  post: "Post", reels: "Reels", story: "Story", carousel: "Carrossel",
  article: "Artigo", video: "Vídeo", other: "Outro",
};

interface ClientBriefsProps {
  clientId: string;
  clientName: string;
  filterMonth?: Date;
}

const ClientBriefs = ({ clientId, clientName, filterMonth }: ClientBriefsProps) => {
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailBrief, setDetailBrief] = useState<Brief | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [comments, setComments] = useState<BriefComment[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    loadBriefs();
  }, [clientId]);

  const loadBriefs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("content_briefs")
      .select("*")
      .eq("client_id", clientId)
      .in("status", ["pending_approval", "approved", "rejected", "published"])
      .order("updated_at", { ascending: false });
    if (data) setBriefs(data as Brief[]);
    setLoading(false);
  };

  const filteredBriefs = useMemo(() => {
    // Hide approved/published briefs from client view
    const pending = briefs.filter((b) => b.status !== "approved" && b.status !== "published");
    if (!filterMonth) return pending;
    const ms = startOfMonth(filterMonth);
    const me = endOfMonth(filterMonth);
    return pending.filter((b) => {
      // Pautas sem data planejada aparecem sempre — não estão presas a um mês
      if (!b.planned_date) return true;
      const d = new Date(b.planned_date);
      return d >= ms && d <= me;
    });
  }, [briefs, filterMonth]);

  const openDetail = async (brief: Brief) => {
    setDetailBrief(brief);
    setDetailOpen(true);
    const { data } = await supabase
      .from("brief_comments")
      .select("*")
      .eq("brief_id", brief.id)
      .order("created_at", { ascending: true });
    if (data) setComments(data.filter((c: any) => c.author_role !== "admin" || true) as BriefComment[]);
  };

  const handleApprove = async (briefId: string) => {
    const brief = briefs.find((b) => b.id === briefId) || detailBrief;
    const { error } = await supabase.from("content_briefs").update({ status: "approved" } as any).eq("id", briefId);
    if (!error) {
      // Create post in "Pauta" column for this client
      if (brief) {
        try {
          // Find or create "Pauta" column
          const { data: existingCols } = await supabase
            .from("columns")
            .select("id, name, position")
            .eq("client_id", clientId);

          let pautaColId: string;
          const pautaCol = (existingCols || []).find((c: any) => c.name.toLowerCase() === "pauta");
          if (pautaCol) {
            pautaColId = pautaCol.id;
          } else {
            const maxPos = (existingCols || []).length;
            const { data: newCol } = await supabase
              .from("columns")
              .insert({ client_id: clientId, name: "Pauta", position: maxPos } as any)
              .select()
              .single();
            if (newCol) {
              pautaColId = (newCol as any).id;
            } else {
              pautaColId = "";
            }
          }

          if (pautaColId) {
            // Create a post from the brief
            await supabase.from("posts").insert({
              title: brief.title,
              caption: brief.caption || brief.description || "",
              image_url: "",
              client_id: clientId,
              column_id: pautaColId,
              client_label: "aprovado",
              status: ["entrada"],
              position: 0,
            } as any);
          }
        } catch (err) {
          console.error("Error creating post from brief:", err);
        }
      }

      toast({ title: "Pauta aprovada!" });
      setDetailBrief((prev) => prev ? { ...prev, status: "approved" } : null);
      loadBriefs();
    }
  };

  const handleReject = async (briefId: string) => {
    const { error } = await supabase.from("content_briefs").update({ status: "rejected" } as any).eq("id", briefId);
    if (!error) {
      toast({ title: "Pauta reprovada" });
      setDetailBrief((prev) => prev ? { ...prev, status: "rejected" } : null);
      loadBriefs();
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !detailBrief) return;
    const { error } = await supabase.from("brief_comments").insert({
      brief_id: detailBrief.id,
      user_id: "client",
      author_name: clientName,
      author_role: "client",
      message: newComment.trim(),
    });
    if (!error) {
      setNewComment("");
      const { data } = await supabase.from("brief_comments").select("*").eq("brief_id", detailBrief.id).order("created_at", { ascending: true });
      if (data) setComments(data as BriefComment[]);
      toast({ title: "Comentário enviado!" });
    }
  };

  // Sort: pending first
  const sorted = [...filteredBriefs].sort((a, b) => {
    if (a.status === "pending_approval" && b.status !== "pending_approval") return -1;
    if (b.status === "pending_approval" && a.status !== "pending_approval") return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  if (loading) return <div className="text-center py-8 text-muted-foreground text-sm">Carregando pautas...</div>;
  if (filteredBriefs.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-bold">Pautas para Aprovar</h2>
        <Badge variant="secondary" className="ml-1 bg-amber-500/15 text-amber-700">
          {filteredBriefs.filter((b) => b.status === "pending_approval").length} pendentes
        </Badge>
      </div>

      {/* Banner explicativo */}
      <div className="flex gap-3 rounded-xl border-2 border-dashed border-amber-400/60 bg-amber-50 p-3 text-sm text-amber-900">
        <Lightbulb className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <p>
          <strong>Estas são ideias de conteúdo aguardando sua aprovação.</strong>{" "}
          Ainda não são os posts finais — depois de aprovadas, nossa equipe irá produzir as artes e legendas.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {sorted.map((brief) => {
          const sc = STATUS_LABELS[brief.status] || { label: brief.status, color: "bg-muted" };
          return (
            <div
              key={brief.id}
              style={NOTEBOOK_BG}
              className="rounded-xl border-2 border-dashed border-amber-400/70 overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer flex flex-col"
              onClick={() => openDetail(brief)}
            >
              <div className="flex items-center gap-2 bg-amber-500 text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest">
                <PencilLine className="h-3.5 w-3.5" />
                Pauta para Aprovação
              </div>
              {brief.media_urls && brief.media_urls.length > 0 && (
                <div className="relative w-full bg-black/5 border-b-2 border-dashed border-amber-300/60" style={{ aspectRatio: "4/5" }}>
                  {/\.(mp4|webm|mov|ogg)(\?|$)/i.test(brief.media_urls[0]) ? (
                    <video src={brief.media_urls[0]} className="absolute inset-0 w-full h-full object-cover" muted />
                  ) : (
                    <img src={brief.media_urls[0]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  )}
                  {brief.media_urls.length > 1 && (
                    <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      +{brief.media_urls.length - 1}
                    </span>
                  )}
                  <span className="absolute bottom-2 left-2 bg-amber-500/95 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Referência
                  </span>
                </div>
              )}
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-900/70">{CONTENT_LABELS[brief.content_type] || brief.content_type}</span>
                  <Badge variant="secondary" className={cn("text-[10px]", sc.color)}>{sc.label}</Badge>
                </div>
                <h3 className="font-semibold text-sm line-clamp-2 text-amber-950">{brief.title}</h3>
                {brief.planned_date && (
                  <span className="text-[11px] text-amber-900/70 flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {new Date(brief.planned_date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                )}
                {brief.status === "pending_approval" && (
                  <div className="flex gap-2 mt-auto pt-2 border-t border-amber-300/60">
                    <Button size="sm" className="flex-1 gap-1 text-xs bg-emerald-500 hover:bg-emerald-600" onClick={(e) => { e.stopPropagation(); handleApprove(brief.id); }}>
                      <Check className="h-3 w-3" /> Aprovar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs text-red-500 hover:text-red-600 bg-white" onClick={(e) => { e.stopPropagation(); handleReject(brief.id); }}>
                      <X className="h-3 w-3" /> Reprovar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="brief-notebook-modal max-w-lg max-h-[85vh] overflow-y-auto p-0 border-2 border-dashed border-amber-400/70 text-amber-950">
          {detailBrief && (
            <>
              <div className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 text-xs font-bold uppercase tracking-widest">
                <PencilLine className="h-4 w-4" />
                Pauta para Aprovação
              </div>
              <div className="p-6">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-900/70">{CONTENT_LABELS[detailBrief.content_type]}</span>
                  <Badge variant="secondary" className={cn("text-xs", STATUS_LABELS[detailBrief.status]?.color)}>
                    {STATUS_LABELS[detailBrief.status]?.label}
                  </Badge>
                </div>
                <DialogTitle className="text-amber-950">{detailBrief.title}</DialogTitle>
                <p className="text-[11px] text-amber-800/80 italic mt-1">
                  Esta é uma ideia em discussão. O post final será criado após sua aprovação.
                </p>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {detailBrief.media_urls && detailBrief.media_urls.length > 0 && (
                  <div>
                    <Label className="text-xs text-amber-900/70 mb-1.5 block">Imagens de referência</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {detailBrief.media_urls.map((url, idx) => {
                        const isVideo = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
                        return (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block relative rounded-lg overflow-hidden border-2 border-dashed border-amber-300 bg-black/5 aspect-square hover:border-amber-500 transition-colors">
                            {isVideo ? (
                              <video src={url} className="absolute inset-0 w-full h-full object-cover" muted />
                            ) : (
                              <img src={url} alt={`Referência ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
                {detailBrief.planned_date && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CalendarIcon className="h-4 w-4" />
                    Data prevista: {new Date(detailBrief.planned_date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </div>
                )}

                {detailBrief.description && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{detailBrief.description}</p>
                  </div>
                )}

                {detailBrief.caption && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Legenda</Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 rounded-lg p-3">{detailBrief.caption}</p>
                  </div>
                )}

                {/* Note: internal_notes are NOT shown to client */}

                {/* Approval actions */}
                {detailBrief.status === "pending_approval" && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button className="flex-1 gap-1.5 bg-emerald-500 hover:bg-emerald-600" onClick={() => handleApprove(detailBrief.id)}>
                      <Check className="h-4 w-4" /> Aprovar
                    </Button>
                    <Button variant="outline" className="flex-1 gap-1.5 text-red-500 hover:text-red-600" onClick={() => handleReject(detailBrief.id)}>
                      <X className="h-4 w-4" /> Reprovar
                    </Button>
                  </div>
                )}

                {/* Comments */}
                <div className="space-y-3 pt-2 border-t">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" /> Comentários
                  </h4>
                  {comments.length === 0 && <p className="text-xs text-muted-foreground">Nenhum comentário.</p>}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comments.map((c) => (
                      <div key={c.id} className={cn("rounded-lg p-2.5 text-sm", c.author_role === "client" ? "bg-blue-500/10 border border-blue-500/20" : "bg-muted/50")}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-xs">{c.author_name}</span>
                          <Badge variant="secondary" className="text-[9px] h-4">
                            {c.author_role === "client" ? "Cliente" : "Equipe"}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(c.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{c.message}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Deixe seu feedback..." rows={2} className="flex-1" />
                    <Button size="sm" onClick={addComment} disabled={!newComment.trim()} className="self-end gap-1">
                      <Send className="h-3 w-3" /> Enviar
                    </Button>
                  </div>
                </div>
              </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientBriefs;
