
ALTER TABLE public.ideas 
  ADD COLUMN converted_to_brief boolean NOT NULL DEFAULT false,
  ADD COLUMN converted_at timestamp with time zone,
  ADD COLUMN converted_brief_id uuid;
