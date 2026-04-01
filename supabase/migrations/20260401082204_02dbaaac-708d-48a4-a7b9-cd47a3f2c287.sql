
CREATE TABLE public.design_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  brand_name text NOT NULL DEFAULT '',
  target_audience text NOT NULL DEFAULT '',
  preferred_colors text NOT NULL DEFAULT '',
  style_preferences text NOT NULL DEFAULT '',
  references_links text NOT NULL DEFAULT '',
  objectives text NOT NULL DEFAULT '',
  additional_notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.design_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own design_briefs"
  ON public.design_briefs
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_design_briefs_updated_at
  BEFORE UPDATE ON public.design_briefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
