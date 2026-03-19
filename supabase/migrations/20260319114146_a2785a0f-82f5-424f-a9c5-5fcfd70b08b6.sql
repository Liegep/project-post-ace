
CREATE TABLE public.client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#fef08a',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client_notes" ON public.client_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Team view assigned client_notes" ON public.client_notes
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Team insert assigned client_notes" ON public.client_notes
  FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Team update own client_notes" ON public.client_notes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Team delete own client_notes" ON public.client_notes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
