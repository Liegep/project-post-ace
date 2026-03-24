import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { URGENCY_STYLES } from "@/lib/deadlineColors";
import { AlertTriangle, Clock, CalendarClock, Check } from "lucide-react";

interface DeadlineNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  clientId: string | null;
  postId: string | null;
  actorAvatarUrl: string;
}

export const NotificationBell = () => {
  const navigate = useNavigate();
  const { userId } = useUserRole();
  const [notifications, setNotifications] = useState<DeadlineNotification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    // Realtime
    const channel = supabase
      .channel("deadline-notifs")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "admin_notifications",
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    // Poll every 5 min
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("admin_notifications")
      .select("*")
      .in("type", ["deadline_warning", "deadline_today", "deadline_overdue", "status_change"])
      .eq("read", false)
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order("created_at", { ascending: false })
      .limit(30);

    setNotifications(
      (data || []).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.read,
        createdAt: n.created_at,
        clientId: n.client_id,
        postId: n.post_id,
        actorAvatarUrl: n.actor_avatar_url || "",
      }))
    );
  };

  const markAsRead = async (id: string) => {
    await supabase.from("admin_notifications").update({ read: true } as any).eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const markAllAsRead = async () => {
    const ids = notifications.map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from("admin_notifications").update({ read: true } as any).in("id", ids);
    setNotifications([]);
  };

  const unreadCount = notifications.length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deadline_overdue": return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      case "deadline_today": return <CalendarClock className="h-3.5 w-3.5 text-amber-500" />;
      case "deadline_warning": return <Clock className="h-3.5 w-3.5 text-blue-500" />;
      default: return <Bell className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case "deadline_overdue": return "border-destructive/20 bg-destructive/5";
      case "deadline_today": return "border-amber-400/20 bg-amber-500/5";
      case "deadline_warning": return "border-blue-400/20 bg-blue-500/5";
      default: return "bg-muted/50";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-foreground text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Nenhuma notificação pendente
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn("flex items-start gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors border-l-2", getTypeBg(n.type))}
                  onClick={() => {
                    markAsRead(n.id);
                    setOpen(false);
                  }}
                >
                  <div className="mt-0.5 shrink-0">{getTypeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(n.createdAt), "dd/MM · HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
