import { ActivityLog } from "@/hooks/useActivityLogs";
import { ACTION_LABELS, ActivityAction } from "@/lib/activityLogger";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2, AlertTriangle, Pencil, Plus, ArrowRightLeft,
  MessageCircle, Archive, RotateCcw, MoveHorizontal, FileText,
  UserPlus, UserMinus, Settings, Type, Send, Share2, Globe,
  CalendarClock, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  CheckCircle2, AlertTriangle, Pencil, Plus, ArrowRightLeft,
  MessageCircle, Archive, RotateCcw, MoveHorizontal, FileText,
  UserPlus, UserMinus, Settings, Type, Send, Share2, Globe, CalendarClock,
};

const ACTION_ICON_NAME: Record<ActivityAction, string> = {
  post_approved: "CheckCircle2",
  post_change_requested: "AlertTriangle",
  post_edited: "Pencil",
  post_created: "Plus",
  post_status_changed: "ArrowRightLeft",
  post_commented: "MessageCircle",
  post_archived: "Archive",
  post_unarchived: "RotateCcw",
  post_moved: "MoveHorizontal",
  brief_created: "FileText",
  brief_status_changed: "ArrowRightLeft",
  brief_commented: "MessageCircle",
  client_created: "UserPlus",
  client_updated: "Settings",
  client_assigned: "UserPlus",
  client_unassigned: "UserMinus",
  caption_edited: "Type",
  feedback_sent: "Send",
  social_post_created: "Share2",
  social_post_published: "Globe",
  social_post_scheduled: "CalendarClock",
  report_created: "FileText",
  report_updated: "Pencil",
  report_published: "Globe",
};

const ACTION_COLOR: Record<string, string> = {
  post_approved: "bg-emerald-500/15 text-emerald-600",
  post_change_requested: "bg-amber-500/15 text-amber-600",
  post_edited: "bg-blue-500/15 text-blue-600",
  post_created: "bg-primary/15 text-primary",
  post_status_changed: "bg-violet-500/15 text-violet-600",
  post_commented: "bg-sky-500/15 text-sky-600",
  post_archived: "bg-muted text-muted-foreground",
  post_unarchived: "bg-teal-500/15 text-teal-600",
  post_moved: "bg-indigo-500/15 text-indigo-600",
  brief_created: "bg-primary/15 text-primary",
  brief_status_changed: "bg-violet-500/15 text-violet-600",
  brief_commented: "bg-sky-500/15 text-sky-600",
  client_created: "bg-emerald-500/15 text-emerald-600",
  client_updated: "bg-muted text-muted-foreground",
  client_assigned: "bg-emerald-500/15 text-emerald-600",
  client_unassigned: "bg-rose-500/15 text-rose-600",
  caption_edited: "bg-blue-500/15 text-blue-600",
  feedback_sent: "bg-amber-500/15 text-amber-600",
  social_post_created: "bg-primary/15 text-primary",
  social_post_published: "bg-emerald-500/15 text-emerald-600",
  social_post_scheduled: "bg-violet-500/15 text-violet-600",
};

interface ActivityTimelineProps {
  logs: ActivityLog[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  showFilters?: boolean;
  showClientName?: boolean;
  onFilterChange?: (filters: { action?: string; userId?: string; dateFrom?: string }) => void;
  compact?: boolean;
}

export function ActivityTimeline({
  logs,
  loading,
  hasMore,
  onLoadMore,
  showFilters = false,
  showClientName = true,
  compact = false,
}: ActivityTimelineProps) {
  const [filterAction, setFilterAction] = useState<string>("all");

  const filteredLogs = filterAction === "all"
    ? logs
    : logs.filter(l => l.action === filterAction);

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!loading && logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Nenhuma atividade registrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showFilters && (
        <div className="flex flex-wrap gap-2 pb-2">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="Filtrar por ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              <SelectItem value="post_approved">Aprovações</SelectItem>
              <SelectItem value="post_change_requested">Solicitações de alteração</SelectItem>
              <SelectItem value="post_edited">Edições</SelectItem>
              <SelectItem value="post_created">Criações</SelectItem>
              <SelectItem value="post_status_changed">Mudanças de status</SelectItem>
              <SelectItem value="post_commented">Comentários</SelectItem>
              <SelectItem value="brief_created">Pautas criadas</SelectItem>
              <SelectItem value="feedback_sent">Feedbacks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-0">
          {filteredLogs.map((log, i) => {
            const iconName = ACTION_ICON_NAME[log.action] || "FileText";
            const IconComp = ICON_MAP[iconName] || FileText;
            const colorClass = ACTION_COLOR[log.action] || "bg-muted text-muted-foreground";
            const actionLabel = ACTION_LABELS[log.action] || log.action;

            return (
              <div key={log.id} className="relative flex gap-3 pl-0 py-2 group">
                {/* Icon */}
                <div className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                  colorClass
                )}>
                  <IconComp className="h-3.5 w-3.5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className={cn("text-sm leading-snug", compact && "text-xs")}>
                    <span className="font-semibold text-foreground">{log.userName}</span>
                    {" "}
                    <span className="text-muted-foreground">{actionLabel}</span>
                    {log.itemTitle && (
                      <>
                        {" "}
                        <span className="font-medium text-foreground">'{log.itemTitle}'</span>
                      </>
                    )}
                    {showClientName && log.clientName && (
                      <>
                        {" "}
                        <span className="text-muted-foreground">para o cliente</span>
                        {" "}
                        <span className="font-medium text-foreground">{log.clientName}</span>
                      </>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: ptBR })}
                    {" · "}
                    {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={loading}
            className="text-xs"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Carregar mais
          </Button>
        </div>
      )}
    </div>
  );
}
