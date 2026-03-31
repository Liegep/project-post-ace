
-- Add locale column to proposals
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'pt';

-- Create proposal templates table
CREATE TABLE public.proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  scope_description TEXT NOT NULL DEFAULT '',
  investment_description TEXT NOT NULL DEFAULT '',
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  currency TEXT NOT NULL DEFAULT 'BRL',
  locale TEXT NOT NULL DEFAULT 'pt',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

-- Super admins see all templates
CREATE POLICY "Super admins manage all templates"
  ON public.proposal_templates FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Admins manage own templates
CREATE POLICY "Admins manage own templates"
  ON public.proposal_templates FOR ALL
  TO authenticated
  USING (user_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_proposal_templates_updated_at
  BEFORE UPDATE ON public.proposal_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
