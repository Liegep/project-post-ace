import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, Send, AlertTriangle, XCircle, FileText, Eye, Loader2 } from "lucide-react";
import type { SocialPostStatus } from "@/hooks/useSocialPosts";

const STATUS_CONFIG: Record<SocialPostStatus, { label: string; icon: React.ComponentType<any>; className: string }> = {
  draft: { label: "Rascunho", icon: FileText, className: "bg-muted text-muted-foreground" },
  pending_approval: { label: "Aguardando Aprovação", icon: Eye, className: "bg-warning/20 text-warning-foreground border-warning/30" },
  approved: { label: "Aprovado", icon: CheckCircle, className: "bg-success/20 text-success border-success/30" },
  scheduled: { label: "Agendado", icon: Clock, className: "bg-info/20 text-info border-info/30" },
  publishing: { label: "Publicando...", icon: Loader2, className: "bg-info/20 text-info border-info/30 animate-pulse" },
  published: { label: "Publicado", icon: Send, className: "bg-success/20 text-success border-success/30" },
  error: { label: "Erro", icon: AlertTriangle, className: "bg-destructive/20 text-destructive border-destructive/30" },
  cancelled: { label: "Cancelado", icon: XCircle, className: "bg-muted text-muted-foreground" },
};

export function SocialStatusBadge({ status }: { status: SocialPostStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1 font-medium ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
