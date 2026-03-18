
-- Table for idea board columns
CREATE TABLE public.idea_columns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.idea_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own idea_columns"
ON public.idea_columns
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Table for ideas within columns
CREATE TABLE public.ideas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  column_id uuid NOT NULL REFERENCES public.idea_columns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ideas"
ON public.ideas
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
