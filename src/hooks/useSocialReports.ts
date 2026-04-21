import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SocialReportMetrics {
  reach?: number;
  impressions?: number;
  engagement?: number;
  interactions?: number;
  clicks?: number;
  profile_visits?: number;
  followers_gained?: number;
  followers_lost?: number;
  posts_published?: number;
  reels_published?: number;
  spend?: number;
  [key: string]: number | undefined;
}

export interface SocialReport {
  id: string;
  client_id: string;
  created_by: string | null;
  title: string;
  period_start: string;
  period_end: string;
  platform: string;
  strategic_comment: string;
  recommendations: string;
  metrics: SocialReportMetrics;
  previous_metrics: SocialReportMetrics;
  best_content: string;
  worst_content: string;
  best_format: string;
  observations: string;
  locale: string;
  status: string;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialReportTemplate {
  id: string;
  name: string;
  created_by: string | null;
  metric_fields: string[];
  created_at: string;
}

export function useSocialReports(clientId?: string) {
  return useQuery({
    queryKey: ["social-reports", clientId],
    queryFn: async () => {
      let query = supabase
        .from("social_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (clientId) query = query.eq("client_id", clientId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SocialReport[];
    },
  });
}

export function useSocialReportTemplates() {
  return useQuery({
    queryKey: ["social-report-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_report_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SocialReportTemplate[];
    },
  });
}

export function useCreateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report: Partial<SocialReport>) => {
      const { data, error } = await supabase
        .from("social_reports")
        .insert(report as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SocialReport;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-reports"] }),
  });
}

export function useUpdateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SocialReport> & { id: string }) => {
      const { data, error } = await supabase
        .from("social_reports")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SocialReport;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-reports"] }),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("social_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-reports"] }),
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template: Partial<SocialReportTemplate>) => {
      const { data, error } = await supabase
        .from("social_report_templates")
        .insert(template as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SocialReportTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social-report-templates"] }),
  });
}

export const METRIC_LABELS: Record<string, string> = {
  views: "Visualizações",
  reach: "Alcance",
  content_interactions: "Interações com o conteúdo",
  profile_visits: "Visitas ao Perfil",
  link_clicks: "Cliques no link",
  followers: "Seguidores",
  // Legacy / Facebook
  impressions: "Impressões",
  engagement: "Engajamento",
  interactions: "Interações",
  clicks: "Cliques",
  followers_gained: "Seguidores Ganhos",
  followers_lost: "Seguidores Perdidos",
  posts_published: "Posts Publicados",
  reels_published: "Reels Publicados",
  spend: "Investimento (R$)",
};

export const INSTAGRAM_METRIC_FIELDS = [
  "views", "reach", "content_interactions", "profile_visits", "link_clicks", "followers",
];

export const FACEBOOK_METRIC_FIELDS = [
  "reach", "impressions", "engagement", "interactions", "clicks",
  "profile_visits", "followers_gained", "followers_lost",
  "posts_published", "spend",
];

export const DEFAULT_METRIC_FIELDS = INSTAGRAM_METRIC_FIELDS;
