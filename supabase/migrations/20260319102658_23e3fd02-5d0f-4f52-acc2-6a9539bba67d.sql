
-- Create appointment_tags table for user-specific colored tags
CREATE TABLE public.appointment_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own appointment_tags"
  ON public.appointment_tags FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add tag_id column to appointments (nullable, references appointment_tags)
ALTER TABLE public.appointments ADD COLUMN tag_id uuid REFERENCES public.appointment_tags(id) ON DELETE SET NULL;
