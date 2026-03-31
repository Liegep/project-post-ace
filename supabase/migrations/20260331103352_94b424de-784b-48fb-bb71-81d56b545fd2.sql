
CREATE TABLE public.user_quick_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  icon_url TEXT NOT NULL DEFAULT '',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_quick_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own quick links"
  ON public.user_quick_links
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
