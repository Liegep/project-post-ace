import { useState } from "react";
import { FileText, BookOpen, Type, PenTool, FileCheck, Calendar, Check, X, Send, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TextContent, CONTENT_TYPE_LABELS, TEXT_STATUS_LABELS, TextContentType } from "@/hooks/useTextContents";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TYPE_ICONS: Record<TextContentType, React.ElementType> = {
  blog: BookOpen,
  artigo: FileText,
  texto: Type,
  copy: PenTool,
  documento: FileCheck,
};

interface TextContentCardProps {
  content: TextContent;
  onClick: () => void;
  isAdmin?: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onComment?: (id: string, message: string) => void;
}

export function TextContentCard({ content, onClick, isAdmin, onApprove, onReject, onComment }: TextContentCardProps) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const Icon = TYPE_ICONS[content.content_type] || FileText;
  const statusConfig = TEXT_STATUS_LABELS[content.status];
  const preview = content.subtitle || content.body.replace(/<[^>]*>/g, "").slice(0, 120);
  const showClientActions = !isAdmin && content.status === "pending_approval";

  const handleComment = async () => {
    if (!comment.trim() || !onComment) return;
    setSending(true);
    await onComment(content.id, comment.trim());
    setComment("");
    setSending(false);
  };

  return (
    <div className="w-full rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/30">
      {/* Clickable card area */}
      <button
        onClick={onClick}
        className="group w-full text-left p-5 focus:outline-none focus:ring-2 focus:ring-ring rounded-t-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <Badge variant="outline" className="text-[10px] font-medium mb-1">
                {CONTENT_TYPE_LABELS[content.content_type]}
              </Badge>
              <h3 className="font-semibold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {content.title}
              </h3>
            </div>
          </div>
          <Badge className={`shrink-0 text-[10px] font-semibold ${statusConfig.color}`}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Preview text */}
        {preview && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3 pl-[46px]">
            {preview}{content.body.replace(/<[^>]*>/g, "").length > 120 && !content.subtitle ? "…" : ""}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pl-[46px]">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {content.planned_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(content.planned_date), "dd MMM", { locale: ptBR })}
              </span>
            )}
            <span>{format(new Date(content.updated_at), "dd/MM/yy", { locale: ptBR })}</span>
          </div>
          <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Ler completo →
          </span>
        </div>
      </button>

      {/* Client actions: approve/reject + comment */}
      {showClientActions && (
        <div className="border-t px-5 py-4 space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onApprove?.(content.id)}
              className="bg-success text-success-foreground hover:bg-success/90"
            >
              <Check className="mr-1.5 h-3.5 w-3.5" /> Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReject?.(content.id)}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <X className="mr-1.5 h-3.5 w-3.5" /> Reprovar
            </Button>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Deixe um comentário..."
                className="min-h-[40px] max-h-[80px] text-sm pl-9 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleComment(); }
                }}
              />
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={handleComment}
              disabled={!comment.trim() || sending}
              className="shrink-0 self-end h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
