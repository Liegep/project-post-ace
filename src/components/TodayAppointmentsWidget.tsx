import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Check, Clock, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface TodayAppt {
  id: string;
  title: string;
  description: string;
  time: string;
  category: string;
  completed: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  "": "bg-primary/10 text-primary",
  reunião: "bg-info/20 text-info",
  tarefa: "bg-accent/20 text-accent-foreground",
  pessoal: "bg-purple-500/20 text-purple-600",
  urgente: "bg-destructive/20 text-destructive",
};

export const TodayAppointmentsWidget = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<TodayAppt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState<TodayAppt | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data } = await supabase
        .from("appointments")
        .select("id, title, description, appointment_time, category, completed")
        .eq("appointment_date", today)
        .order("appointment_time", { ascending: true });

      setAppointments(
        (data || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          description: r.description || "",
          time: r.appointment_time?.slice(0, 5) || "09:00",
          category: r.category || "",
          completed: r.completed,
        }))
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const toggleComplete = async (id: string, completed: boolean) => {
    setAppointments(prev =>
      prev.map(a => (a.id === id ? { ...a, completed } : a))
    );
    if (selectedAppt?.id === id) {
      setSelectedAppt(prev => prev ? { ...prev, completed } : null);
    }
    await supabase.from("appointments").update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    } as any).eq("id", id);
  };

  if (loading || appointments.length === 0) return null;

  const pending = appointments.filter(a => !a.completed).length;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground">Agenda de hoje</h2>
          {pending > 0 && (
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
              {pending} pendente{pending !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate("/agenda")}
          className="text-xs font-medium text-primary hover:underline"
        >
          Ver agenda completa →
        </button>
      </div>
      <div className="space-y-1.5 max-h-56 overflow-y-auto">
        {appointments.map(apt => {
          const now = new Date();
          const aptTime = new Date(`${format(now, "yyyy-MM-dd")}T${apt.time}`);
          const isOverdue = !apt.completed && aptTime < now;
          const catStyle = CATEGORY_COLORS[apt.category.toLowerCase()] || CATEGORY_COLORS[""];

          return (
            <div
                key={apt.id}
                onClick={() => setSelectedAppt(apt)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors cursor-pointer",
                  apt.completed ? "bg-success/5 opacity-60" : isOverdue ? "bg-destructive/5" : "bg-muted/50 hover:bg-muted"
                )}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); toggleComplete(apt.id, !apt.completed); }}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    apt.completed
                      ? "bg-success border-success text-white"
                      : isOverdue
                        ? "border-destructive hover:bg-destructive/10"
                        : "border-muted-foreground/40 hover:border-primary"
                  )}
                >
                  {apt.completed && <Check className="h-3 w-3" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm font-medium",
                    apt.completed ? "line-through text-muted-foreground" : "text-foreground"
                  )}>
                    {apt.title}
                  </span>
                  {apt.category && (
                    <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium", catStyle)}>
                      {apt.category}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "flex items-center gap-1 text-xs font-mono shrink-0",
                  apt.completed ? "text-muted-foreground/50" : isOverdue ? "text-destructive" : "text-muted-foreground"
                )}>
                  <Clock className="h-3 w-3" />
                  {apt.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAppt} onOpenChange={(open) => !open && setSelectedAppt(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {selectedAppt?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedAppt && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Hoje às {selectedAppt.time}</span>
                {selectedAppt.category && (
                  <Badge variant="outline" className={cn("text-xs", CATEGORY_COLORS[selectedAppt.category.toLowerCase()] || "")}>
                    {selectedAppt.category}
                  </Badge>
                )}
              </div>
              {selectedAppt.completed && (
                <Badge className="bg-success/20 text-success border-success/30">Concluído</Badge>
              )}
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {selectedAppt.description || "Sem descrição adicional."}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
