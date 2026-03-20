import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Check, Clock, CalendarDays, Plus, X, Trash2, CalendarClock } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface TodayAppt {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  category: string;
  completed: boolean;
  tagId: string | null;
}

interface ApptTag {
  id: string;
  name: string;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  "": "bg-primary/10 text-primary",
  reunião: "bg-info/20 text-info",
  tarefa: "bg-accent/20 text-accent-foreground",
  pessoal: "bg-purple-500/20 text-purple-600",
  urgente: "bg-destructive/20 text-destructive",
};

const CATEGORIES = ["reunião", "tarefa", "pessoal", "urgente"];

export const TodayAppointmentsWidget = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<TodayAppt[]>([]);
  const [tags, setTags] = useState<ApptTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState<TodayAppt | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newCategory, setNewCategory] = useState("");
  const [newTagId, setNewTagId] = useState<string | null>(null);
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState("09:00");
  const [rescheduling, setRescheduling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchToday = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const [{ data: apptData }, { data: tagData }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, title, description, appointment_date, appointment_time, category, completed, tag_id")
        .eq("appointment_date", today)
        .order("appointment_time", { ascending: true }),
      supabase.from("appointment_tags" as any).select("*").order("name"),
    ]);

    setAppointments(
      (apptData || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description || "",
        date: r.appointment_date,
        time: r.appointment_time?.slice(0, 5) || "09:00",
        category: r.category || "",
        completed: r.completed,
        tagId: r.tag_id || null,
      }))
    );
    setTags((tagData || []).map((t: any) => ({ id: t.id, name: t.name, color: t.color })));
    setLoading(false);
  };

  useEffect(() => { fetchToday(); }, []);

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

  const handleQuickAdd = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const today = format(new Date(), "yyyy-MM-dd");
    await supabase.from("appointments").insert({
      user_id: user.id,
      title: newTitle.trim(),
      description: newDesc.trim(),
      appointment_date: today,
      appointment_time: newTime,
      category: newCategory,
      tag_id: newTagId,
    } as any);
    setNewTitle("");
    setNewDesc("");
    setNewTime("09:00");
    setNewCategory("");
    setNewTagId(null);
    setShowQuickAdd(false);
    setSaving(false);
    await fetchToday();
  };

  const handleReschedule = async () => {
    if (!selectedAppt || !rescheduleDate) return;
    setRescheduling(true);
    const newDate = format(rescheduleDate, "yyyy-MM-dd");
    await supabase.from("appointments").update({
      appointment_date: newDate,
      appointment_time: rescheduleTime,
    } as any).eq("id", selectedAppt.id);
    setRescheduling(false);
    setRescheduleOpen(false);
    setSelectedAppt(null);
    await fetchToday();
  };

  const handleDelete = async () => {
    if (!selectedAppt) return;
    setDeleting(true);
    await supabase.from("appointments").delete().eq("id", selectedAppt.id);
    setDeleting(false);
    setSelectedAppt(null);
    await fetchToday();
  };

  const openReschedule = () => {
    if (!selectedAppt) return;
    setRescheduleDate(new Date(selectedAppt.date + "T12:00:00"));
    setRescheduleTime(selectedAppt.time);
    setRescheduleOpen(true);
  };

  const pending = appointments.filter(a => !a.completed).length;
  const getTag = (tagId: string | null) => tagId ? tags.find(t => t.id === tagId) : null;

  if (loading) return null;

  return (
    <>
      <div className="rounded-xl border border-border bg-white dark:bg-card p-4">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              title="Novo compromisso"
            >
              {showQuickAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => navigate("/agenda")}
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver agenda completa →
            </button>
          </div>
        </div>

        {showQuickAdd && (
          <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <Input
              placeholder="Título do compromisso"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
            <div className="flex gap-2 flex-wrap">
              <Input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="h-8 text-sm w-28"
              />
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="h-8 text-sm rounded-md border border-input bg-background px-2 flex-1 min-w-[100px]"
              >
                <option value="">Categoria</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {tags.length > 0 && (
                <select
                  value={newTagId || ""}
                  onChange={e => setNewTagId(e.target.value || null)}
                  className="h-8 text-sm rounded-md border border-input bg-background px-2 flex-1 min-w-[100px]"
                >
                  <option value="">Etiqueta</option>
                  {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>
            <Textarea
              placeholder="Descrição (opcional)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="text-sm min-h-[50px] resize-none"
              rows={2}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleQuickAdd} disabled={saving || !newTitle.trim()}>
                {saving ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        )}

        {appointments.length === 0 && !showQuickAdd ? (
          <p className="text-sm text-muted-foreground text-center py-3">Nenhum compromisso hoje.</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {appointments.map(apt => {
              const now = new Date();
              const aptTime = new Date(`${format(now, "yyyy-MM-dd")}T${apt.time}`);
              const isOverdue = !apt.completed && aptTime < now;
              const catStyle = CATEGORY_COLORS[apt.category.toLowerCase()] || CATEGORY_COLORS[""];
              const aptTag = getTag(apt.tagId);
              const useTagColor = !apt.completed && !isOverdue && aptTag;

              return (
                <div
                  key={apt.id}
                  onClick={() => setSelectedAppt(apt)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors cursor-pointer",
                    apt.completed ? "bg-success/5 opacity-60" : isOverdue ? "bg-destructive/5" : useTagColor ? "" : "bg-muted/50 hover:bg-muted"
                  )}
                  style={useTagColor ? { backgroundColor: aptTag!.color + "20" } : undefined}
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
                    {aptTag && !apt.completed && (
                      <span
                        className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: aptTag.color + "30", color: aptTag.color }}
                      >
                        {aptTag.name}
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
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedAppt && !rescheduleOpen} onOpenChange={(open) => !open && setSelectedAppt(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {selectedAppt?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedAppt && (() => {
            const aptTag = getTag(selectedAppt.tagId);
            return (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                  <Clock className="h-4 w-4" />
                  <span>Hoje às {selectedAppt.time}</span>
                  {selectedAppt.category && (
                    <Badge variant="outline" className={cn("text-xs", CATEGORY_COLORS[selectedAppt.category.toLowerCase()] || "")}>
                      {selectedAppt.category}
                    </Badge>
                  )}
                  {aptTag && (
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{ backgroundColor: aptTag.color + "20", color: aptTag.color, borderColor: aptTag.color + "50" }}
                    >
                      {aptTag.name}
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

                {/* Actions: Reschedule & Delete */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={openReschedule}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    Reagendar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir compromisso</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir "{selectedAppt.title}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={deleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting ? "Excluindo..." : "Excluir"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Reschedule dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={(open) => { if (!open) setRescheduleOpen(false); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-5 w-5 text-primary" />
              Reagendar compromisso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Escolha a nova data e horário para "{selectedAppt?.title}".
            </p>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={rescheduleDate}
                onSelect={setRescheduleDate}
                className="rounded-md border"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground">Horário:</label>
              <Input
                type="time"
                value={rescheduleTime}
                onChange={e => setRescheduleTime(e.target.value)}
                className="h-8 text-sm w-32"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setRescheduleOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1"
                disabled={!rescheduleDate || rescheduling}
                onClick={handleReschedule}
              >
                {rescheduling ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<TodayAppt[]>([]);
  const [tags, setTags] = useState<ApptTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState<TodayAppt | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newCategory, setNewCategory] = useState("");
  const [newTagId, setNewTagId] = useState<string | null>(null);
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchToday = async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const [{ data: apptData }, { data: tagData }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, title, description, appointment_time, category, completed, tag_id")
        .eq("appointment_date", today)
        .order("appointment_time", { ascending: true }),
      supabase.from("appointment_tags" as any).select("*").order("name"),
    ]);

    setAppointments(
      (apptData || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description || "",
        time: r.appointment_time?.slice(0, 5) || "09:00",
        category: r.category || "",
        completed: r.completed,
        tagId: r.tag_id || null,
      }))
    );
    setTags((tagData || []).map((t: any) => ({ id: t.id, name: t.name, color: t.color })));
    setLoading(false);
  };

  useEffect(() => { fetchToday(); }, []);

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

  const handleQuickAdd = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const today = format(new Date(), "yyyy-MM-dd");
    await supabase.from("appointments").insert({
      user_id: user.id,
      title: newTitle.trim(),
      description: newDesc.trim(),
      appointment_date: today,
      appointment_time: newTime,
      category: newCategory,
      tag_id: newTagId,
    } as any);
    setNewTitle("");
    setNewDesc("");
    setNewTime("09:00");
    setNewCategory("");
    setNewTagId(null);
    setShowQuickAdd(false);
    setSaving(false);
    await fetchToday();
  };

  const pending = appointments.filter(a => !a.completed).length;
  const getTag = (tagId: string | null) => tagId ? tags.find(t => t.id === tagId) : null;

  if (loading) return null;

  return (
    <>
      <div className="rounded-xl border border-border bg-white dark:bg-card p-4">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickAdd(!showQuickAdd)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              title="Novo compromisso"
            >
              {showQuickAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => navigate("/agenda")}
              className="text-xs font-medium text-primary hover:underline"
            >
              Ver agenda completa →
            </button>
          </div>
        </div>

        {showQuickAdd && (
          <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <Input
              placeholder="Título do compromisso"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Input
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
                className="h-8 text-sm w-28"
              />
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="h-8 text-sm rounded-md border border-input bg-background px-2 flex-1"
              >
                <option value="">Categoria</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {tags.length > 0 && (
                <select
                  value={newTagId || ""}
                  onChange={e => setNewTagId(e.target.value || null)}
                  className="h-8 text-sm rounded-md border border-input bg-background px-2 flex-1"
                >
                  <option value="">Etiqueta</option>
                  {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>
            <Textarea
              placeholder="Descrição (opcional)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="text-sm min-h-[50px] resize-none"
              rows={2}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleQuickAdd} disabled={saving || !newTitle.trim()}>
                {saving ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        )}

        {appointments.length === 0 && !showQuickAdd ? (
          <p className="text-sm text-muted-foreground text-center py-3">Nenhum compromisso hoje.</p>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {appointments.map(apt => {
              const now = new Date();
              const aptTime = new Date(`${format(now, "yyyy-MM-dd")}T${apt.time}`);
              const isOverdue = !apt.completed && aptTime < now;
              const catStyle = CATEGORY_COLORS[apt.category.toLowerCase()] || CATEGORY_COLORS[""];
              const aptTag = getTag(apt.tagId);
              const useTagColor = !apt.completed && !isOverdue && aptTag;

              return (
                <div
                  key={apt.id}
                  onClick={() => setSelectedAppt(apt)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors cursor-pointer",
                    apt.completed ? "bg-success/5 opacity-60" : isOverdue ? "bg-destructive/5" : useTagColor ? "" : "bg-muted/50 hover:bg-muted"
                  )}
                  style={useTagColor ? { backgroundColor: aptTag!.color + "20" } : undefined}
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
                    {aptTag && !apt.completed && (
                      <span
                        className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: aptTag.color + "30", color: aptTag.color }}
                      >
                        {aptTag.name}
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
        )}
      </div>

      <Dialog open={!!selectedAppt} onOpenChange={(open) => !open && setSelectedAppt(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              {selectedAppt?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedAppt && (() => {
            const aptTag = getTag(selectedAppt.tagId);
            return (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Hoje às {selectedAppt.time}</span>
                  {selectedAppt.category && (
                    <Badge variant="outline" className={cn("text-xs", CATEGORY_COLORS[selectedAppt.category.toLowerCase()] || "")}>
                      {selectedAppt.category}
                    </Badge>
                  )}
                  {aptTag && (
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{ backgroundColor: aptTag.color + "20", color: aptTag.color, borderColor: aptTag.color + "50" }}
                    >
                      {aptTag.name}
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
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};