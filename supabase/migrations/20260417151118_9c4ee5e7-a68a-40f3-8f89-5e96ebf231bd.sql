ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);