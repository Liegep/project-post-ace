ALTER TABLE public.brand_vocabulary
  ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS related_words text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS approved_phrases text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS can_be_used boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS technical_notes text NOT NULL DEFAULT '';