import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n/I18nContext";
import { useAppointments, Appointment } from "@/hooks/useAppointments";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LanguageSelector } from "@/components/LanguageSelector";
import UserProfileMenu from "@/components/UserProfileMenu";
import {
  Plus, ChevronLeft, ChevronRight, CalendarIcon, Check, Clock,
  Trash2, ArrowLeft, CalendarDays, CalendarRange, Calendar as CalendarLucide
} from "lucide-react";
import { format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, addMonths, subMonths, addWeeks, subWeeks, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

type RepeatMode = "none" | "week" | "month";

type ViewMode = "day" | "week" | "month";

const CATEGORY_COLORS: Record<string, string> = {
  "": "bg-primary/10 text-primary",
  reunião: "bg-info/20 text-info",
  tarefa: "bg-accent/20 text-accent-foreground",
  pessoal: "bg-purple-500/20 text-purple-600",
  urgente: "bg-destructive/20 text-destructive",
};

const getCategoryStyle = (cat: string) => CATEGORY_COLORS[cat.toLowerCase()] || CATEGORY_COLORS[""];

const AgendaPage = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { appointments, loading, createAppointment, createBatch, toggleComplete, deleteAppointment } = useAppointments();

  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState<Date>(new Date());
  const [formTime, setFormTime] = useState("09:00");
  const [formCategory, setFormCategory] = useState("");
  const [formRepeat, setFormRepeat] = useState<RepeatMode>("none");
  const [saving, setSaving] = useState(false);

  const navigateDate = (dir: number) => {
    if (viewMode === "day") setCurrentDate(prev => dir > 0 ? addDays(prev, 1) : subDays(prev, 1));
    else if (viewMode === "week") setCurrentDate(prev => dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setCurrentDate(prev => dir > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  const getDateRange = (): { start: Date; end: Date } => {
    if (viewMode === "day") return { start: currentDate, end: currentDate };
    if (viewMode === "week") return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
    return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
  };

  const filteredAppointments = useMemo(() => {
    const { start, end } = getDateRange();
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");
    return appointments.filter(a => a.appointmentDate >= startStr && a.appointmentDate <= endStr);
  }, [appointments, currentDate, viewMode]);

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    filteredAppointments.forEach(a => {
      if (!map[a.appointmentDate]) map[a.appointmentDate] = [];
      map[a.appointmentDate].push(a);
    });
    // Sort each day by time
    Object.values(map).forEach(arr => arr.sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime)));
    return map;
  }, [filteredAppointments]);

  const handleCreate = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);

    const baseInput = {
      title: formTitle.trim(),
      description: formDesc.trim(),
      appointmentTime: formTime,
      category: formCategory,
    };

    if (formRepeat === "none") {
      await createAppointment({
        ...baseInput,
        appointmentDate: format(formDate, "yyyy-MM-dd"),
      });
    } else {
      // Generate dates for the repeat period
      let dates: Date[] = [];
      if (formRepeat === "week") {
        const weekStart = startOfWeek(formDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(formDate, { weekStartsOn: 1 });
        dates = eachDayOfInterval({ start: weekStart, end: weekEnd });
      } else {
        const monthStart = startOfMonth(formDate);
        const monthEnd = endOfMonth(formDate);
        dates = eachDayOfInterval({ start: monthStart, end: monthEnd });
      }

      const inputs = dates.map(d => ({
        ...baseInput,
        appointmentDate: format(d, "yyyy-MM-dd"),
      }));

      await createBatch(inputs);
    }

    setSaving(false);
    setDialogOpen(false);
    setFormTitle("");
    setFormDesc("");
    setFormDate(new Date());
    setFormTime("09:00");
    setFormCategory("");
    setFormRepeat("none");
  };

  const openCreateForDate = (date?: Date) => {
    setFormDate(date || currentDate);
    setFormTitle("");
    setFormDesc("");
    setFormTime("09:00");
    setFormCategory("");
    setDialogOpen(true);
  };

  const headerTitle = () => {
    if (viewMode === "day") return format(currentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    if (viewMode === "week") {
      const { start, end } = getDateRange();
      return `${format(start, "dd MMM", { locale: ptBR })} — ${format(end, "dd MMM yyyy", { locale: ptBR })}`;
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  };

  const pendingCount = filteredAppointments.filter(a => !a.completed).length;
  const completedCount = filteredAppointments.filter(a => a.completed).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 sm:px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Agenda</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Seus compromissos e tarefas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <UserProfileMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 sm:p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday} className="font-medium">
              Hoje
            </Button>
            <div className="flex items-center rounded-lg border bg-card">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm font-medium text-foreground capitalize min-w-0 truncate max-w-[260px]">
                {headerTitle()}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggles */}
            <div className="flex rounded-lg border bg-card p-0.5">
              {([
                { mode: "day" as ViewMode, icon: CalendarDays, label: "Dia" },
                { mode: "week" as ViewMode, icon: CalendarRange, label: "Semana" },
                { mode: "month" as ViewMode, icon: CalendarLucide, label: "Mês" },
              ]).map(({ mode, icon: Icon, label }) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "ghost"}
                  size="sm"
                  className={cn("h-8 gap-1.5 text-xs", viewMode === mode && "bg-primary text-primary-foreground")}
                  onClick={() => setViewMode(mode)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              ))}
            </div>

            {/* Stats */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs">
              <Badge variant="outline" className="gap-1 bg-warning/10 text-warning-foreground border-warning/30">
                <Clock className="h-3 w-3" /> {pendingCount}
              </Badge>
              <Badge variant="outline" className="gap-1 bg-success/10 text-success border-success/30">
                <Check className="h-3 w-3" /> {completedCount}
              </Badge>
            </div>

            <Button onClick={() => openCreateForDate()} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo compromisso</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : viewMode === "month" ? (
          <MonthView
            currentDate={currentDate}
            appointmentsByDate={appointmentsByDate}
            onDayClick={(d) => { setCurrentDate(d); setViewMode("day"); }}
            onCreateClick={(d) => openCreateForDate(d)}
          />
        ) : (
          <DayListView
            dates={viewMode === "day"
              ? [currentDate]
              : eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) })
            }
            appointmentsByDate={appointmentsByDate}
            onToggle={toggleComplete}
            onDelete={deleteAppointment}
            onCreateClick={(d) => openCreateForDate(d)}
          />
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo compromisso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Título do compromisso"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Descrição (opcional)"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              className="resize-none min-h-[60px]"
            />
            <div className="grid grid-cols-2 gap-3">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formDate, "dd/MM/yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formDate}
                    onSelect={(d) => { if (d) { setFormDate(d); setCalendarOpen(false); } }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Input
                type="time"
                value={formTime}
                onChange={e => setFormTime(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["", "reunião", "tarefa", "pessoal", "urgente"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFormCategory(cat)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-all",
                    formCategory === cat
                      ? "ring-2 ring-primary ring-offset-1 " + getCategoryStyle(cat)
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {cat || "Geral"}
                </button>
              ))}
            </div>
            <Button onClick={handleCreate} disabled={saving || !formTitle.trim()} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {saving ? "Salvando..." : "Criar compromisso"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Day/Week List View ──────────────────────────────────────────────────────────

interface DayListViewProps {
  dates: Date[];
  appointmentsByDate: Record<string, Appointment[]>;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onCreateClick: (date: Date) => void;
}

const DayListView = ({ dates, appointmentsByDate, onToggle, onDelete, onCreateClick }: DayListViewProps) => {
  return (
    <div className="space-y-4">
      {dates.map(date => {
        const dateStr = format(date, "yyyy-MM-dd");
        const dayAppointments = appointmentsByDate[dateStr] || [];
        const today = isToday(date);

        return (
          <div key={dateStr} className={cn("rounded-xl border transition-colors", today ? "border-accent/50 bg-accent/5" : "bg-card")}>
            {/* Day header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex flex-col items-center justify-center h-12 w-12 rounded-xl font-bold",
                  today ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                )}>
                  <span className="text-lg leading-none">{format(date, "dd")}</span>
                  <span className="text-[10px] uppercase leading-none mt-0.5">{format(date, "EEE", { locale: ptBR })}</span>
                </div>
                {today && <Badge className="bg-accent text-accent-foreground text-[10px]">HOJE</Badge>}
                {dates.length > 1 && (
                  <span className="text-sm text-muted-foreground capitalize">{format(date, "EEEE", { locale: ptBR })}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onCreateClick(date)}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>

            {/* Appointments */}
            <div className="p-2">
              {dayAppointments.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum compromisso para este dia
                </div>
              ) : (
                <div className="space-y-1.5">
                  {dayAppointments.map(apt => (
                    <AppointmentCard key={apt.id} appointment={apt} onToggle={onToggle} onDelete={onDelete} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Appointment Card ────────────────────────────────────────────────────────────

const AppointmentCard = ({ appointment: apt, onToggle, onDelete }: {
  appointment: Appointment;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) => {
  const now = new Date();
  const aptDateTime = new Date(`${apt.appointmentDate}T${apt.appointmentTime}`);
  const isOverdue = !apt.completed && isBefore(aptDateTime, now);

  return (
    <div className={cn(
      "group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-all",
      apt.completed
        ? "bg-success/5 opacity-70"
        : isOverdue
          ? "bg-destructive/5 border border-destructive/20"
          : "hover:bg-muted/50"
    )}>
      {/* Complete button */}
      <button
        onClick={() => onToggle(apt.id, !apt.completed)}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
          apt.completed
            ? "bg-success border-success text-white"
            : isOverdue
              ? "border-destructive hover:bg-destructive/10"
              : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10"
        )}
      >
        {apt.completed && <Check className="h-3 w-3" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-sm font-medium",
            apt.completed ? "line-through text-muted-foreground" : "text-foreground"
          )}>
            {apt.title}
          </span>
          {apt.category && (
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", getCategoryStyle(apt.category))}>
              {apt.category}
            </span>
          )}
          {isOverdue && !apt.completed && (
            <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive bg-destructive/10">
              Atrasado
            </Badge>
          )}
          {apt.completed && (
            <Badge variant="outline" className="text-[10px] border-success/30 text-success bg-success/10">
              Concluído
            </Badge>
          )}
        </div>
        {apt.description && (
          <p className={cn("text-xs mt-0.5", apt.completed ? "text-muted-foreground/60 line-through" : "text-muted-foreground")}>
            {apt.description}
          </p>
        )}
      </div>

      {/* Time */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn(
          "flex items-center gap-1 text-xs font-mono",
          apt.completed ? "text-muted-foreground/50" : isOverdue ? "text-destructive" : "text-muted-foreground"
        )}>
          <Clock className="h-3 w-3" />
          {apt.appointmentTime}
        </span>
        <button
          onClick={() => onDelete(apt.id)}
          className="opacity-0 group-hover:opacity-100 rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

// ── Month View ──────────────────────────────────────────────────────────────────

interface MonthViewProps {
  currentDate: Date;
  appointmentsByDate: Record<string, Appointment[]>;
  onDayClick: (date: Date) => void;
  onCreateClick: (date: Date) => void;
}

const MonthView = ({ currentDate, appointmentsByDate, onDayClick, onCreateClick }: MonthViewProps) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {weekDays.map(d => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
        {allDays.map((day, i) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayApts = appointmentsByDate[dateStr] || [];
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const today = isToday(day);
          const pendingCount = dayApts.filter(a => !a.completed).length;
          const completedCount = dayApts.filter(a => a.completed).length;

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={cn(
                "min-h-[90px] border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-muted/30",
                !isCurrentMonth && "opacity-40"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                  today ? "bg-accent text-accent-foreground font-bold" : "text-foreground"
                )}>
                  {format(day, "d")}
                </span>
                {dayApts.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCreateClick(day); }}
                    className="rounded-full p-0.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
              {dayApts.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {dayApts.slice(0, 3).map(apt => (
                    <div
                      key={apt.id}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium truncate",
                        apt.completed
                          ? "bg-success/10 text-success line-through"
                          : getCategoryStyle(apt.category)
                      )}
                    >
                      <span className="font-mono mr-1">{apt.appointmentTime}</span>
                      {apt.title}
                    </div>
                  ))}
                  {dayApts.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{dayApts.length - 3} mais</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgendaPage;
