import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  TextContent,
  TextContentComment,
  CONTENT_TYPE_LABELS,
  TEXT_STATUS_LABELS,
} from "@/hooks/useTextContents";
import {
  FileText, BookOpen, Type, PenTool, FileCheck,
  Calendar, Check, X, Send, MessageCircle, Download,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TYPE_ICONS: Record<string, React.ElementType> = {
  blog: BookOpen, artigo: FileText, texto: Type, copy: PenTool, documento: FileCheck,
};

interface Props {
  content: TextContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
  clientName?: string;
  onStatusChange?: (id: string, status: string) => void;
}

export function TextContentDetailDialog({ content, open, onOpenChange, isAdmin, clientName, onStatusChange }: Props) {
  const isMobile = useIsMobile();
  const [comments, setComments] = useState<TextContentComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (content && open) loadComments(content.id);
  }, [content, open]);

  const loadComments = async (id: string) => {
    const { data } = await supabase
      .from("text_content_comments")
      .select("*")
      .eq("text_content_id", id)
      .order("created_at", { ascending: true });
    if (data) setComments(data as unknown as TextContentComment[]);
  };

  const sendComment = async () => {
    if (!newComment.trim() || !content) return;
    setSending(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || "anonymous";
    const authorName = isAdmin ? "Equipe" : (clientName || "Cliente");
    const authorRole = isAdmin ? "admin" : "client";

    const { error } = await supabase.from("text_content_comments").insert({
      text_content_id: content.id,
      user_id: userId,
      author_name: authorName,
      author_role: authorRole,
      message: newComment.trim(),
    } as any);

    if (!error) {
      setNewComment("");
      loadComments(content.id);
    }
    setSending(false);
  };

  const handleApprove = () => {
    if (content && onStatusChange) onStatusChange(content.id, "approved");
  };
  const handleReject = () => {
    if (content && onStatusChange) onStatusChange(content.id, "rejected");
  };

  if (!content) return null;

  const Icon = TYPE_ICONS[content.content_type] || FileText;
  const statusConfig = TEXT_STATUS_LABELS[content.status];

  const body = (
    <div className="flex flex-col h-full !text-black">
      {/* Article header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 !text-primary" />
          </div>
          <Badge variant="outline" className="text-xs !text-black border-black/20 bg-white/60">
            {CONTENT_TYPE_LABELS[content.content_type]}
          </Badge>
          <Badge className={`text-xs ${statusConfig.color}`}>
            {statusConfig.label}
          </Badge>
          {content.planned_date && (
            <span className="flex items-center gap-1 text-xs !text-black/60 ml-auto">
              <Calendar className="h-3 w-3" />
              {format(new Date(content.planned_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold !text-black leading-tight mb-2">
          {content.title}
        </h1>
        {content.subtitle && (
          <p className="text-lg !text-black/70 leading-relaxed">
            {content.subtitle}
          </p>
        )}
      </div>

      <Separator />

      {/* Article body */}
      <ScrollArea className="flex-1 px-6 py-6">
        {content.pdf_url && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 !text-primary shrink-0" />
              <span className="text-sm font-medium !text-black truncate">
                {content.pdf_name || "Documento PDF"}
              </span>
            </div>
            <Button asChild size="sm" className="shrink-0">
              <a href={content.pdf_url} target="_blank" rel="noopener noreferrer" download={content.pdf_name || true} className="!text-white">
                <Download className="mr-2 h-4 w-4" /> Baixar PDF
              </a>
            </Button>
          </div>
        )}
        <article
          className="prose prose-sm sm:prose max-w-none leading-[1.8] !text-black [&_*]:!text-black [&_a]:!text-blue-600 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded"
          dangerouslySetInnerHTML={{ __html: content.body }}
        />


        {content.observations && (
          <div className="mt-8 rounded-lg border bg-black/5 p-4">
            <p className="text-xs font-semibold !text-black/60 mb-1">Observações</p>
            <p className="text-sm !text-black whitespace-pre-wrap">{content.observations}</p>
          </div>
        )}

        {/* Comments section */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="h-4 w-4 !text-black/60" />
            <h3 className="text-sm font-semibold !text-black">
              Comentários ({comments.length})
            </h3>
          </div>

          {comments.length > 0 && (
            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-lg p-3 ${
                    c.author_role === "admin"
                      ? "bg-primary/5 border border-primary/10"
                      : "bg-black/5 border border-black/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold !text-black">{c.author_name}</span>
                    <span className="text-[10px] !text-black/50">
                      {format(new Date(c.created_at), "dd/MM HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm !text-black whitespace-pre-wrap">{c.message}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escreva um comentário..."
              className="min-h-[60px] text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendComment(); }
              }}
            />
            <Button
              size="icon"
              onClick={sendComment}
              disabled={!newComment.trim() || sending}
              className="shrink-0 self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Sticky approval footer for client */}
      {!isAdmin && content.status === "pending_approval" && (
        <div className="border-t bg-card px-6 py-4 flex items-center gap-3">
          <Button onClick={handleApprove} className="flex-1 sm:flex-none bg-success text-success-foreground hover:bg-success/90">
            <Check className="mr-2 h-4 w-4" /> Aprovar
          </Button>
          <Button onClick={handleReject} variant="outline" className="flex-1 sm:flex-none text-destructive border-destructive/30 hover:bg-destructive/10">
            <X className="mr-2 h-4 w-4" /> Reprovar
          </Button>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-2xl">
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden flex flex-col !bg-white/95 !backdrop-blur-xl !text-black !border-white/30">
        {body}
      </DialogContent>
    </Dialog>
  );
}
