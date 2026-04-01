ALTER TABLE public.design_briefs 
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general',
ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb;