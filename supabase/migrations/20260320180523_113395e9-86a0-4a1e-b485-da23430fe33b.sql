
-- Social Reports table
CREATE TABLE public.social_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by uuid,
  title text NOT NULL DEFAULT '',
  period_start date NOT NULL,
  period_end date NOT NULL,
  platform text NOT NULL DEFAULT 'instagram',
  strategic_comment text NOT NULL DEFAULT '',
  recommendations text NOT NULL DEFAULT '',
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  best_content text NOT NULL DEFAULT '',
  worst_content text NOT NULL DEFAULT '',
  best_format text NOT NULL DEFAULT '',
  observations text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  template_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Report templates table
CREATE TABLE public.social_report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid,
  metric_fields jsonb NOT NULL DEFAULT '["reach","impressions","engagement","interactions","clicks","profile_visits","followers_gained","followers_lost","posts_published","reels_published"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_report_templates ENABLE ROW LEVEL SECURITY;

-- RLS for social_reports
CREATE POLICY "Super admins view all reports" ON public.social_reports
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Admins view assigned client reports" ON public.social_reports
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Colaboradors view assigned client reports" ON public.social_reports
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'colaborador'::app_role) AND client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Clients view own reports" ON public.social_reports
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client'::app_role) AND client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Admins can insert reports" ON public.social_reports
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update reports" ON public.social_reports
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete reports" ON public.social_reports
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for templates
CREATE POLICY "Authenticated can view templates" ON public.social_report_templates
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage templates" ON public.social_report_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
