ALTER TABLE public.posts ADD COLUMN archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN archived_at timestamp with time zone;