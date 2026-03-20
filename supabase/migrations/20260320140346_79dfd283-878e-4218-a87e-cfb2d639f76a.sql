
CREATE TABLE public.commemorative_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country text NOT NULL,
  country_code text NOT NULL DEFAULT '',
  country_color text NOT NULL DEFAULT '#3b82f6',
  name text NOT NULL,
  date_month integer NOT NULL,
  date_day integer NOT NULL,
  category text NOT NULL DEFAULT 'cultural',
  description text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.commemorative_dates ENABLE ROW LEVEL SECURITY;

-- Only internal users can view
CREATE POLICY "Internal users can view commemorative_dates"
ON public.commemorative_dates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'colaborador')
  )
);

-- Only admins can manage
CREATE POLICY "Admins can manage commemorative_dates"
ON public.commemorative_dates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
