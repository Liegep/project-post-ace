
CREATE TABLE public.internal_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  assigned_to uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);

ALTER TABLE public.internal_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage internal_approvals" ON public.internal_approvals FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Assigned users can view their approvals" ON public.internal_approvals FOR SELECT TO authenticated USING (assigned_to = auth.uid());

CREATE POLICY "Assigned users can update their approvals" ON public.internal_approvals FOR UPDATE TO authenticated USING (assigned_to = auth.uid());

CREATE POLICY "Team can view assigned client approvals" ON public.internal_approvals FOR SELECT TO authenticated USING (client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Team can insert for assigned clients" ON public.internal_approvals FOR INSERT TO authenticated WITH CHECK (client_id IN (SELECT get_user_client_ids(auth.uid())));

ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_approvals;
