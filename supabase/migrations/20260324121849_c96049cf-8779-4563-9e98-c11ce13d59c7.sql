
-- Add hybrid access config columns to clients
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS require_login boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_quick_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_expiration_days integer NOT NULL DEFAULT 7;

-- Create approval_tokens table
CREATE TABLE public.approval_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  token_type text NOT NULL DEFAULT 'individual',
  created_by uuid,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_at timestamp with time zone,
  active boolean NOT NULL DEFAULT true
);

-- Create approval_actions table to log actions taken via token
CREATE TABLE public.approval_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES public.approval_tokens(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  action text NOT NULL,
  comment text NOT NULL DEFAULT '',
  actor_name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for approval_tokens
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage approval_tokens" ON public.approval_tokens
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can read active tokens" ON public.approval_tokens
  FOR SELECT TO anon
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Team can manage assigned client tokens" ON public.approval_tokens
  FOR ALL TO authenticated
  USING (client_id IN (SELECT get_user_client_ids(auth.uid())))
  WITH CHECK (client_id IN (SELECT get_user_client_ids(auth.uid())));

-- RLS for approval_actions
ALTER TABLE public.approval_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage approval_actions" ON public.approval_actions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can insert approval_actions" ON public.approval_actions
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can read approval_actions" ON public.approval_actions
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Team can view assigned approval_actions" ON public.approval_actions
  FOR SELECT TO authenticated
  USING (post_id IN (
    SELECT p.id FROM posts p WHERE p.client_id IN (SELECT get_user_client_ids(auth.uid()))
  ));
