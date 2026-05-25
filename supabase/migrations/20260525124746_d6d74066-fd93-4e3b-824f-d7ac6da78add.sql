ALTER TABLE public.visual_directions
ADD COLUMN IF NOT EXISTS typography text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS brand_name text NOT NULL DEFAULT '';