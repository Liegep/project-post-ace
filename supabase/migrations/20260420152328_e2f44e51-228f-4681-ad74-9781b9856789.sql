
-- 1. Brief Templates (reusable forms)
CREATE TABLE public.brief_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  locale TEXT NOT NULL DEFAULT 'pt',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.brief_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own brief_templates"
  ON public.brief_templates FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins manage all brief_templates"
  ON public.brief_templates FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE TRIGGER update_brief_templates_updated_at
  BEFORE UPDATE ON public.brief_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Brief Assignments (template sent to a client)
CREATE TABLE public.brief_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.brief_templates(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending', -- pending | submitted | reopened
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brief_assignments_client ON public.brief_assignments(client_id);
CREATE INDEX idx_brief_assignments_template ON public.brief_assignments(template_id);

ALTER TABLE public.brief_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage brief_assignments"
  ON public.brief_assignments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team view assigned brief_assignments"
  ON public.brief_assignments FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Clients view own brief_assignments"
  ON public.brief_assignments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client'::app_role) AND client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE TRIGGER update_brief_assignments_updated_at
  BEFORE UPDATE ON public.brief_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Brief Responses (client answers)
CREATE TABLE public.brief_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.brief_assignments(id) ON DELETE CASCADE UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.brief_templates(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_by UUID,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brief_responses_client ON public.brief_responses(client_id);
CREATE INDEX idx_brief_responses_assignment ON public.brief_responses(assignment_id);

ALTER TABLE public.brief_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage brief_responses"
  ON public.brief_responses FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team view assigned brief_responses"
  ON public.brief_responses FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Clients view own brief_responses"
  ON public.brief_responses FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client'::app_role) AND client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Clients insert own brief_responses"
  ON public.brief_responses FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'client'::app_role) AND client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Clients update own brief_responses"
  ON public.brief_responses FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'client'::app_role) AND client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE TRIGGER update_brief_responses_updated_at
  BEFORE UPDATE ON public.brief_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
