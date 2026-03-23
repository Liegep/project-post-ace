import { FileText, BookOpen, Type, PenTool, FileCheck, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
}

export function TextContentCard({ content, onClick, isAdmin }: TextContentCardProps) {
  const Icon = TYPE_ICONS[content.content_type] || FileText;
  const statusConfig = TEXT_STATUS_LABELS[content.status];
  const preview = content.subtitle || content.body.slice(0, 120);

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-xl border bg-card p-5 transition-all hover:shadow-md hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-ring"
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
          {preview}{content.body.length > 120 && !content.subtitle ? "…" : ""}
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
  );
}
