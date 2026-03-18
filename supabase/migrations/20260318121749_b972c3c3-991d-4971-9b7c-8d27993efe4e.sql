
-- First drop the default, then change type, then set new default
ALTER TABLE public.posts ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.posts ALTER COLUMN status TYPE text[] USING ARRAY[status];
ALTER TABLE public.posts ALTER COLUMN status SET DEFAULT '{entrada}'::text[];
