
-- Permissions table for per-user financial document access
CREATE TABLE public.client_billing_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  can_view_invoices boolean NOT NULL DEFAULT false,
  can_download_invoices boolean NOT NULL DEFAULT false,
  can_view_attachments boolean NOT NULL DEFAULT false,
  can_download_attachments boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, user_id)
);

ALTER TABLE public.client_billing_permissions ENABLE ROW LEVEL SECURITY;

-- Admins manage all permissions
CREATE POLICY "Admins manage billing permissions"
  ON public.client_billing_permissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own permissions
CREATE POLICY "Users view own billing permissions"
  ON public.client_billing_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Audit log table for financial document access
CREATE TABLE public.billing_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  document_type text NOT NULL,
  document_id uuid,
  document_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_access_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view and insert logs
CREATE POLICY "Admins manage billing access logs"
  ON public.billing_access_logs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert their own logs
CREATE POLICY "Users insert own billing access logs"
  ON public.billing_access_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Updated at trigger for permissions
CREATE TRIGGER update_billing_permissions_updated_at
  BEFORE UPDATE ON public.client_billing_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
