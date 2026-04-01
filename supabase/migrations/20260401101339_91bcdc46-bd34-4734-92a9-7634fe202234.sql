
-- Add respondent fields to design_briefs
ALTER TABLE public.design_briefs 
  ADD COLUMN IF NOT EXISTS respondent_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS respondent_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz DEFAULT NULL;

-- Allow anon to update briefs that have active tokens (for client filling)
CREATE POLICY "Anon can update briefs via token"
  ON public.design_briefs
  FOR UPDATE
  USING (
    id IN (
      SELECT brief_id FROM public.design_brief_tokens
      WHERE active = true AND expires_at > now()
    )
  )
  WITH CHECK (
    id IN (
      SELECT brief_id FROM public.design_brief_tokens
      WHERE active = true AND expires_at > now()
    )
  );

-- Allow anon role specifically  
GRANT UPDATE ON public.design_briefs TO anon;
