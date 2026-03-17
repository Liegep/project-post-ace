import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TrackingStep {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface PostTrackingLabelsProps {
  postId: string;
  clientId: string;
  isAdmin?: boolean;
}

const stepsCache: Record<string, TrackingStep[]> = {};
const stepsFetching: Record<string, Promise<TrackingStep[]>> = {};
export const PostTrackingLabels = ({ postId, clientId, isAdmin = false }: PostTrackingLabelsProps) => {
  const [steps, setSteps] = useState<TrackingStep[]>(stepsCache[clientId] || []);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!stepsCache[clientId]) {
        if (!stepsFetching[clientId]) {
          stepsFetching[clientId] = supabase.from("tracking_steps").select("*").eq("client_id", clientId).order("position")
            .then(({ data }) => {
              const steps = (data || []).map((s: any) => ({ id: s.id, name: s.name, color: s.color, position: s.position }));
              stepsCache[clientId] = steps;
              return steps;
            });
        }
        await stepsFetching[clientId];
      }
      setSteps(stepsCache[clientId]);

      const { data: trackingData } = await supabase.from("post_tracking").select("step_id, completed").eq("post_id", postId);
      const completed = new Set<string>();
      (trackingData || []).forEach((t: any) => { if (t.completed) completed.add(t.step_id); });
      setCompletedSteps(completed);
      setLoaded(true);
    };
    load();
  }, [postId, clientId]);

  const toggleStep = async (stepId: string) => {
    if (!isAdmin) return;
    const nowCompleted = !completedSteps.has(stepId);

    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (nowCompleted) next.add(stepId);
      else next.delete(stepId);
      return next;
    });

    const { data: existing } = await supabase.from("post_tracking").select("id").eq("post_id", postId).eq("step_id", stepId).maybeSingle();

    if (existing) {
      await supabase.from("post_tracking").update({
        completed: nowCompleted,
        completed_at: nowCompleted ? new Date().toISOString() : null,
      } as any).eq("post_id", postId).eq("step_id", stepId);
    } else {
      await supabase.from("post_tracking").insert({
        post_id: postId,
        step_id: stepId,
        completed: nowCompleted,
        completed_at: nowCompleted ? new Date().toISOString() : null,
      } as any);
    }
  };

  if (!loaded || steps.length === 0) return null;

  const completedCount = steps.filter((s) => completedSteps.has(s.id)).length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
      <Popover>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center gap-2 rounded-md border border-muted-foreground/20 px-2 py-1 hover:bg-muted/50 transition-colors">
            {/* Mini progress bar */}
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: progress === 100 ? "hsl(142, 71%, 45%)" : "hsl(var(--primary))",
                }}
              />
            </div>
            <span className="text-[9px] font-bold text-muted-foreground shrink-0">{completedCount}/{steps.length}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Acompanhamento</p>
          <div className="space-y-0.5">
            {steps.map((step) => {
              const done = completedSteps.has(step.id);
              return (
                <button
                  key={step.id}
                  onClick={() => toggleStep(step.id)}
                  disabled={!isAdmin}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                    isAdmin && "hover:bg-muted cursor-pointer",
                    !isAdmin && "cursor-default"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      done ? "border-transparent" : "border-muted-foreground/30"
                    )}
                    style={done ? { backgroundColor: step.color } : {}}
                  >
                    {done && <Check className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className={cn("text-left flex-1", done ? "line-through text-muted-foreground" : "text-foreground")}>
                    {step.name}
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
