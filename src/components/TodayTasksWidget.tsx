import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { getDeadlineUrgency, URGENCY_STYLES, DeadlineUrgency } from "@/lib/deadlineColors";
import { CalendarClock, FileText, DollarSign, Newspaper, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { format, startOfDay, endOfDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TaskItem {
  id: string;
  title: string;
  clientName: string;
  clientSlug: string;
  clientLogo: string;
  type: "post" | "invoice" | "brief" | "calendar_post";
  deadline: string;
  urgency: DeadlineUrgency;
  status?: string;
}

const TYPE_CONFIG = {
  post: { icon: Newspaper, label: "Post", color: "bg-blue-500/15 text-blue-600" },
  invoice: { icon: DollarSign, label: "Fatura", color: "bg-emerald-500/15 text-emerald-600" },
  brief: { icon: FileText, label: "Pauta", color: "bg-purple-500/15 text-purple-600" },
  calendar_post: { icon: CalendarClock, label: "Agendamento", color: "bg-amber-500/15 text-amber-600" },
};

export const TodayTasksWidget = () => {
  const navigate = useNavigate();
  const { userId } = useUserRole();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"today" | "upcoming" | "overdue">("today");

  useEffect(() => {
    if (!userId) return;
    fetchTasks();
  }, [userId]);

  const fetchTasks = async () => {
    setLoading(true);
    const now = new Date();
    const weekAhead = addDays(now, 7);

    // Get user's client IDs
    const { data: assignments } = await supabase
      .from("user_client_assignments")
      .select("client_id")
      .eq("user_id", userId!);
    const clientIds = (assignments || []).map((a: any) => a.client_id);

    if (clientIds.length === 0) { setTasks([]); setLoading(false); return; }

    // Fetch clients for mapping
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name, slug, logo_url")
      .in("id", clientIds);
    const clientMap: Record<string, { name: string; slug: string; logo_url: string }> = {};
    (clientsData || []).forEach((c: any) => { clientMap[c.id] = c; });

    const allTasks: TaskItem[] = [];

    // 1. Posts with deadlines
    const { data: posts } = await supabase
      .from("posts")
      .select("id, title, client_id, deadline, status")
      .in("client_id", clientIds)
      .eq("archived", false)
      .not("deadline", "is", null)
      .lte("deadline", weekAhead.toISOString())
      .order("deadline", { ascending: true });

    (posts || []).forEach((p: any) => {
      const client = clientMap[p.client_id];
      if (!client) return;
      allTasks.push({
        id: p.id,
        title: p.title,
        clientName: client.name,
        clientSlug: client.slug,
        clientLogo: client.logo_url || "",
        type: "post",
        deadline: p.deadline,
        urgency: getDeadlineUrgency(p.deadline),
        status: Array.isArray(p.status) ? p.status.join(", ") : p.status,
      });
    });

    // 2. Invoices due
    const { data: invoices } = await supabase
      .from("invoices")
      .select("id, title, client_id, due_date, status")
      .in("client_id", clientIds)
      .in("status", ["open", "overdue"])
      .lte("due_date", format(weekAhead, "yyyy-MM-dd"))
      .order("due_date", { ascending: true });

    (invoices || []).forEach((inv: any) => {
      const client = clientMap[inv.client_id];
      if (!client) return;
      allTasks.push({
        id: inv.id,
        title: inv.title || `Fatura #${inv.invoice_number || ""}`,
        clientName: client.name,
        clientSlug: client.slug,
        clientLogo: client.logo_url || "",
        type: "invoice",
        deadline: inv.due_date,
        urgency: getDeadlineUrgency(inv.due_date),
        status: inv.status,
      });
    });

    // 3. Briefs with planned_date
    const { data: briefs } = await supabase
      .from("content_briefs")
      .select("id, title, client_id, planned_date, status")
      .in("client_id", clientIds)
      .not("planned_date", "is", null)
      .lte("planned_date", format(weekAhead, "yyyy-MM-dd"))
      .not("status", "in", '("published","rejected")')
      .order("planned_date", { ascending: true });

    (briefs || []).forEach((b: any) => {
      const client = clientMap[b.client_id];
      if (!client) return;
      allTasks.push({
        id: b.id,
        title: b.title,
        clientName: client.name,
        clientSlug: client.slug,
        clientLogo: client.logo_url || "",
        type: "brief",
        deadline: b.planned_date,
        urgency: getDeadlineUrgency(b.planned_date),
        status: b.status,
      });
    });

    // 4. Calendar posts
    const { data: calPosts } = await supabase
      .from("calendar_posts")
      .select("id, title, client_id, publish_date, status")
      .in("client_id", clientIds)
      .lte("publish_date", format(weekAhead, "yyyy-MM-dd"))
      .not("status", "in", '("published")')
      .order("publish_date", { ascending: true });

    (calPosts || []).forEach((cp: any) => {
      const client = clientMap[cp.client_id];
      if (!client) return;
      allTasks.push({
        id: cp.id,
        title: cp.title,
        clientName: client.name,
        clientSlug: client.slug,
        clientLogo: client.logo_url || "",
        type: "calendar_post",
        deadline: cp.publish_date,
        urgency: getDeadlineUrgency(cp.publish_date),
        status: cp.status,
      });
    });

    // Sort by urgency priority then deadline
    const urgencyOrder: Record<DeadlineUrgency, number> = { overdue: 0, urgent: 1, normal: 2, none: 3 };
    allTasks.sort((a, b) => {
      const ua = urgencyOrder[a.urgency];
      const ub = urgencyOrder[b.urgency];
      if (ua !== ub) return ua - ub;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    setTasks(allTasks);
    setLoading(false);
  };

  const today = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const filteredTasks = useMemo(() => {
    if (filter === "today") {
      return tasks.filter(t => {
        const d = new Date(t.deadline);
        return d >= today && d <= todayEnd;
      });
    }
    if (filter === "overdue") {
      return tasks.filter(t => t.urgency === "overdue");
    }
    // upcoming = urgent (next 3 days)
    return tasks.filter(t => t.urgency === "urgent" && new Date(t.deadline) > todayEnd);
  }, [tasks, filter]);

  const overdueTasks = tasks.filter(t => t.urgency === "overdue");
  const todayTasks = tasks.filter(t => {
    const d = new Date(t.deadline);
    return d >= today && d <= todayEnd;
  });
  const upcomingTasks = tasks.filter(t => t.urgency === "urgent" && new Date(t.deadline) > todayEnd);

  if (loading || tasks.length === 0) return null;

  const getUrgencyIcon = (urgency: DeadlineUrgency) => {
    switch (urgency) {
      case "overdue": return <AlertTriangle className="h-3.5 w-3.5" />;
      case "urgent": return <Clock className="h-3.5 w-3.5" />;
      case "normal": return <CheckCircle2 className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
          <CalendarClock className="h-4 w-4 text-primary" />
        </div>
        <h2 className="font-bold text-foreground">Tarefas com Prazo</h2>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-3">
        <button
          onClick={() => setFilter("overdue")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1",
            filter === "overdue" ? "bg-destructive text-destructive-foreground" : "bg-destructive/10 text-destructive hover:bg-destructive/20"
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          Atrasadas ({overdueTasks.length})
        </button>
        <button
          onClick={() => setFilter("today")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1",
            filter === "today" ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          <CalendarClock className="h-3 w-3" />
          Hoje ({todayTasks.length})
        </button>
        <button
          onClick={() => setFilter("upcoming")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1",
            filter === "upcoming" ? "bg-amber-500 text-white" : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
          )}
        >
          <Clock className="h-3 w-3" />
          Em breve ({upcomingTasks.length})
        </button>
      </div>

      {/* Tasks list */}
      {filteredTasks.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          {filter === "today" ? "Nenhuma tarefa para hoje 🎉" : filter === "overdue" ? "Nenhuma tarefa atrasada ✅" : "Nenhuma tarefa nos próximos 3 dias"}
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {filteredTasks.map((task) => {
            const urgencyStyle = URGENCY_STYLES[task.urgency];
            const typeConfig = TYPE_CONFIG[task.type];
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={`${task.type}-${task.id}`}
                onClick={() => {
                  if (task.type === "post" || task.type === "calendar_post") {
                    navigate(`/admin/${task.clientSlug}`);
                  } else if (task.type === "invoice") {
                    navigate("/billing");
                  } else if (task.type === "brief") {
                    navigate("/briefs");
                  }
                }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors border",
                  urgencyStyle.bg,
                  urgencyStyle.border,
                  "hover:opacity-80"
                )}
              >
                {/* Urgency dot */}
                <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", urgencyStyle.dot)} />

                {/* Client logo */}
                {task.clientLogo ? (
                  <img src={task.clientLogo} alt={task.clientName} className="h-7 w-7 rounded-full object-contain border shrink-0" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted border shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">{task.clientName.charAt(0).toUpperCase()}</span>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.clientName}</p>
                </div>

                {/* Type badge */}
                <span className={cn("shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", typeConfig.color)}>
                  <TypeIcon className="h-3 w-3" />
                  {typeConfig.label}
                </span>

                {/* Deadline badge */}
                <span className={cn("shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", urgencyStyle.bg, urgencyStyle.text)}>
                  {getUrgencyIcon(task.urgency)}
                  {format(new Date(task.deadline), "dd/MM")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
