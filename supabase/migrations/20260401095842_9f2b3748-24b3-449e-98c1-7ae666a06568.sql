
-- Add client_id to design_briefs
ALTER TABLE public.design_briefs
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create sharing tokens table
CREATE TABLE public.design_brief_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.design_briefs(id) ON DELETE CASCADE,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(token)
);

ALTER TABLE public.design_brief_tokens ENABLE ROW LEVEL SECURITY;

-- Admins can manage tokens
CREATE POLICY "Admins manage brief tokens"
  ON public.design_brief_tokens FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Owner can manage own tokens
CREATE POLICY "Users manage own brief tokens"
  ON public.design_brief_tokens FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Anon can read active tokens (for public page)
CREATE POLICY "Anon read active tokens"
  ON public.design_brief_tokens FOR SELECT
  TO anon
  USING (active = true AND expires_at > now());

-- Allow anon to read design_briefs via valid token
CREATE POLICY "Anon read briefs via token"
  ON public.design_briefs FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT brief_id FROM public.design_brief_tokens
      WHERE active = true AND expires_at > now()
    )
  );

-- Allow clients to view briefs linked to their client_id
CREATE POLICY "Clients view linked briefs"
  ON public.design_briefs FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'client'::app_role)
    AND client_id IN (SELECT get_user_client_ids(auth.uid()))
  );
