
CREATE TABLE public.columns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Columns are publicly readable" ON public.columns FOR SELECT TO public USING (true);
CREATE POLICY "Columns are publicly insertable" ON public.columns FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Columns are publicly updatable" ON public.columns FOR UPDATE TO public USING (true);
CREATE POLICY "Columns are publicly deletable" ON public.columns FOR DELETE TO public USING (true);
