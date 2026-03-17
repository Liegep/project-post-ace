import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Post } from "@/types/post";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Circle, Plus, Trash2, GripVertical, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TrackingStep {
  id: string;
  name: string;
  color: string;
  position: number;
}

interface PostTracking {
  post_id: string;
  step_id: string;
  completed: boolean;
}

const DEFAULT_STEPS = [
  { name: "Roteiro", color: "#6366f1" },
  { name: "Design / Arte", color: "#f59e0b" },
  { name: "Legenda", color: "#3b82f6" },
  { name: "Revisão", color: "#8b5cf6" },
  { name: "Agendado", color: "#06b6d4" },
  { name: "Publicado", color: "#22c55e" },
];

const STEP_COLORS = [
  "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6", "#f97316",
];

interface TrackingPanelProps {
  clientId: string;
  posts: Post[];
  isAdmin?: boolean;
}

export const TrackingPanel = ({ clientId, posts, isAdmin = false }: TrackingPanelProps) => {
  const [steps, setSteps] = useState<TrackingStep[]>([]);
  const [trackingData, setTrackingData] = useState<PostTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [newStepName, setNewStepName] = useState("");
  const [newStepColor, setNewStepColor] = useState(STEP_COLORS[0]);
  const [collapsedPosts, setCollapsedPosts] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [stepsRes, trackingRes] = await Promise.all([
      supabase.from("tracking_steps").select("*").eq("client_id", clientId).order("position"),
      supabase.from("post_tracking").select("*"),
    ]);

    const fetchedSteps = (stepsRes.data || []) as any[];
    setSteps(fetchedSteps.map((s: any) => ({ id: s.id, name: s.name, color: s.color, position: s.position })));

    // Filter tracking data for posts that belong to this client
    const postIds = posts.map((p) => p.id);
    const filtered = (trackingRes.data || []).filter((t: any) => postIds.includes(t.post_id));
    setTrackingData(filtered.map((t: any) => ({ post_id: t.post_id, step_id: t.step_id, completed: t.completed })));
    setLoading(false);
  }, [clientId, posts]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleStep = async (postId: string, stepId: string) => {
    if (!isAdmin) return;

    const existing = trackingData.find((t) => t.post_id === postId && t.step_id === stepId);
    const newCompleted = !existing?.completed;

    // Optimistic update
    setTrackingData((prev) => {
      const filtered = prev.filter((t) => !(t.post_id === postId && t.step_id === stepId));
      return [...filtered, { post_id: postId, step_id: stepId, completed: newCompleted }];
    });

    if (existing) {
      await supabase.from("post_tracking").update({
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      } as any).eq("post_id", postId).eq("step_id", stepId);
    } else {
      await supabase.from("post_tracking").insert({
        post_id: postId,
        step_id: stepId,
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      } as any);
    }
  };

  const addStep = async () => {
    if (!newStepName.trim()) return;
    const { data } = await supabase.from("tracking_steps").insert({
      client_id: clientId,
      name: newStepName.trim(),
      color: newStepColor,
      position: steps.length,
    } as any).select().single();
    if (data) {
      setSteps((prev) => [...prev, { id: (data as any).id, name: (data as any).name, color: (data as any).color, position: (data as any).position }]);
      setNewStepName("");
      setNewStepColor(STEP_COLORS[(steps.length + 1) % STEP_COLORS.length]);
    }
  };

  const deleteStep = async (stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    setTrackingData((prev) => prev.filter((t) => t.step_id !== stepId));
    await supabase.from("post_tracking").delete().eq("step_id", stepId);
    await supabase.from("tracking_steps").delete().eq("id", stepId);
  };

  const getPostProgress = (postId: string) => {
    if (steps.length === 0) return 0;
    const completed = steps.filter((s) => trackingData.some((t) => t.post_id === postId && t.step_id === s.id && t.completed)).length;
    return Math.round((completed / steps.length) * 100);
  };

  const isStepCompleted = (postId: string, stepId: string) => {
    return trackingData.some((t) => t.post_id === postId && t.step_id === stepId && t.completed);
  };

  const toggleCollapse = (postId: string) => {
    setCollapsedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="w-80 shrink-0 rounded-xl border bg-card/50 p-4">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  // Overall stats
  const totalTasks = posts.length * steps.length;
  const completedTasks = trackingData.filter((t) => t.completed).length;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="w-96 shrink-0 rounded-xl border bg-gradient-to-b from-card to-card/80 p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            📊 Acompanhamento
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {completedTasks}/{totalTasks} etapas concluídas
          </p>
        </div>
        {isAdmin && (
          <Popover open={showSettings} onOpenChange={setShowSettings}>
            <PopoverTrigger asChild>
              <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <Settings2 className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <p className="text-sm font-semibold mb-3">Gerenciar Etapas</p>
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: step.color }} />
                    <span className="flex-1 truncate">{step.name}</span>
                    <button onClick={() => deleteStep(step.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3">
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newStepName}
                    onChange={(e) => setNewStepName(e.target.value)}
                    placeholder="Nova etapa..."
                    className="h-8 text-xs"
                    onKeyDown={(e) => e.key === "Enter" && addStep()}
                  />
                </div>
                <div className="flex gap-1 mb-2">
                  {STEP_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewStepColor(c)}
                      className={cn("h-5 w-5 rounded-full border-2 transition-transform", newStepColor === c ? "border-foreground scale-110" : "border-transparent")}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <Button size="sm" onClick={addStep} disabled={!newStepName.trim()} className="w-full h-7 text-xs">
                  <Plus className="mr-1 h-3 w-3" /> Adicionar Etapa
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Overall progress */}
      <div className="mb-4 rounded-lg bg-muted/50 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-muted-foreground">Progresso Geral</span>
          <span className="text-xs font-bold text-foreground">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {/* Steps legend */}
      {steps.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {steps.map((step) => (
            <Badge
              key={step.id}
              variant="outline"
              className="text-[10px] px-2 py-0.5 gap-1 font-medium"
            >
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: step.color }} />
              {step.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Posts checklist */}
      <div className="space-y-1.5 max-h-[calc(100vh-350px)] overflow-y-auto pr-1">
        {posts.map((post) => {
          const isFinalized = post.status === "finalizado";
          const progress = getPostProgress(post.id);
          const isCollapsed = collapsedPosts.has(post.id);
          const allStepsDone = progress === 100;

          return (
            <div
              key={post.id}
              className={cn(
                "rounded-lg border p-3 transition-colors",
                isFinalized ? "bg-success/5 border-success/20" : "bg-card"
              )}
            >
              {/* Simple checklist item: post name + finalized indicator */}
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                    isFinalized
                      ? "border-success bg-success"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isFinalized && <Check className="h-3 w-3 text-success-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isFinalized ? "line-through text-muted-foreground" : "text-foreground"
                  )}>
                    {post.title}
                  </p>
                </div>
                {isFinalized && (
                  <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30 shrink-0">
                    Finalizado
                  </Badge>
                )}
                {!isFinalized && steps.length > 0 && (
                  <button onClick={() => toggleCollapse(post.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
                    {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>

              {/* Steps detail (only if not finalized and expanded) */}
              {!isFinalized && !isCollapsed && steps.length > 0 && (
                <div className="mt-2 ml-7 space-y-1 border-t pt-2">
                  {steps.map((step) => {
                    const done = isStepCompleted(post.id, step.id);
                    return (
                      <button
                        key={step.id}
                        onClick={() => toggleStep(post.id, step.id)}
                        disabled={!isAdmin}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors",
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
                        <span className={cn("text-left", done ? "line-through text-muted-foreground" : "text-foreground")}>{step.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {posts.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">Nenhum post para acompanhar</p>
        )}
      </div>
    </div>
  );
};
