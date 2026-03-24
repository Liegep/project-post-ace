ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS retain_files boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;