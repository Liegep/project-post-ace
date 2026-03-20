
CREATE TABLE public.user_favorite_countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  country text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, country)
);

ALTER TABLE public.user_favorite_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own favorite countries"
ON public.user_favorite_countries
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
