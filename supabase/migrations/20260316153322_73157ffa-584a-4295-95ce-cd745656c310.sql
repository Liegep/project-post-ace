
ALTER TABLE public.posts ADD COLUMN column_id uuid REFERENCES public.columns(id) ON DELETE SET NULL;
