
CREATE TABLE public.hashtag_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  hashtags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hashtag_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hashtag groups are publicly readable" ON public.hashtag_groups FOR SELECT TO public USING (true);
CREATE POLICY "Hashtag groups are publicly insertable" ON public.hashtag_groups FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Hashtag groups are publicly updatable" ON public.hashtag_groups FOR UPDATE TO public USING (true);
CREATE POLICY "Hashtag groups are publicly deletable" ON public.hashtag_groups FOR DELETE TO public USING (true);
