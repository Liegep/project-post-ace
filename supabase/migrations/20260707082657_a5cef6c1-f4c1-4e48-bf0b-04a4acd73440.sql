ALTER TABLE public.calendar_posts ADD COLUMN IF NOT EXISTS event_color text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS event_color text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS calendar_legend jsonb NOT NULL DEFAULT '[]'::jsonb;