import { differenceInDays, startOfDay } from "date-fns";

export type DeadlineUrgency = "overdue" | "urgent" | "normal" | "none";

export function getDeadlineUrgency(deadline: Date | string | null): DeadlineUrgency {
  if (!deadline) return "none";
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  const today = startOfDay(new Date());
  const deadlineDay = startOfDay(d);
  const diff = differenceInDays(deadlineDay, today);

  if (diff < 0) return "overdue";
  if (diff <= 3) return "urgent";
  return "normal";
}

export const URGENCY_STYLES: Record<DeadlineUrgency, { bg: string; text: string; border: string; dot: string; label: string }> = {
  overdue: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    dot: "bg-destructive",
    label: "Atrasado",
  },
  urgent: {
    bg: "bg-amber-500/10",
    text: "text-amber-600",
    border: "border-amber-400/30",
    dot: "bg-amber-500",
    label: "Prazo próximo",
  },
  normal: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600",
    border: "border-emerald-400/30",
    dot: "bg-emerald-500",
    label: "Em dia",
  },
  none: {
    bg: "bg-muted/50",
    text: "text-muted-foreground",
    border: "border-border",
    dot: "bg-muted-foreground",
    label: "Sem prazo",
  },
};
