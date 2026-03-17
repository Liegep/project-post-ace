import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";
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

// Simple cache for steps per client to avoid refetching
const stepsCache: Record<string, TrackingStep[]> = {};

export const PostTrackingLabels = ({ postId, clientId, isAdmin = false }: PostTrackingLabelsProps) => {
  const [steps, setSteps] = useState<TrackingStep[]>(stepsCache[clientId] || []);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Fetch steps if not cached
      if (!stepsCache[clientId]) {
        const { data } = await supabase.from("tracking_steps").select("*").eq("client_id", clientId).order("position");
        stepsCache[clientId] = (data || []).map((s: any) => ({ id: s.id, name: s.name, color: s.color, position: s.position }));
      }
      setSteps(stepsCache[clientId]);

      // Fetch tracking for this post
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

    // Check if record exists
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
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {/* Mini progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              backgroundColor: progress === 100 ? "hsl(var(--success))" : "hsl(var(--primary))",
            }}
          />
        </div>
        <span className="text-[9px] font-bold text-muted-foreground shrink-0">{progress}%</span>
      </div>

      {/* Step labels */}
      <div className="flex flex-wrap gap-1">
        {steps.map((step) => {
          const done = completedSteps.has(step.id);
          return (
            <button
              key={step.id}
              onClick={() => toggleStep(step.id)}
              disabled={!isAdmin}
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-semibold transition-all border",
                isAdmin && "cursor-pointer hover:scale-105",
                !isAdmin && "cursor-default",
                done
                  ? "text-white border-transparent"
                  : "bg-transparent border-muted-foreground/20 text-muted-foreground"
              )}
              style={done ? { backgroundColor: step.color, borderColor: step.color } : {}}
            >
              {done && <Check className="h-2.5 w-2.5" />}
              {step.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
