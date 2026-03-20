
-- Activity logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  item_type text NOT NULL,
  item_id text,
  item_title text NOT NULL DEFAULT '',
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  client_name text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for performance
CREATE INDEX idx_activity_logs_client_id ON public.activity_logs(client_id);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_item_id ON public.activity_logs(item_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can see all logs
CREATE POLICY "Super admins can view all activity_logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- Admins can view logs of their assigned clients
CREATE POLICY "Admins view logs of assigned clients"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND (
    client_id IN (SELECT public.get_user_client_ids(auth.uid()))
    OR client_id IS NULL
  )
);

-- Colaboradors view logs of assigned clients
CREATE POLICY "Colaboradors view logs of assigned clients"
ON public.activity_logs FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'colaborador'::app_role)
  AND client_id IN (SELECT public.get_user_client_ids(auth.uid()))
);

-- Anyone authenticated can insert logs
CREATE POLICY "Authenticated can insert activity_logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Service role (edge functions) can insert
CREATE POLICY "Anon can insert activity_logs"
ON public.activity_logs FOR INSERT
TO anon
WITH CHECK (true);
