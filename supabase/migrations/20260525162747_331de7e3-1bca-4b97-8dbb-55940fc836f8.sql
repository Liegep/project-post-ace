-- Add toggle for allowing clients to edit their Brand Brain
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS allow_client_edit_brand_brain boolean NOT NULL DEFAULT false;

-- Helper to check if client editing is enabled for a given client
CREATE OR REPLACE FUNCTION public.client_can_edit_brand_brain(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT allow_client_edit_brand_brain FROM public.clients WHERE id = _client_id), false)
$$;

-- Grant managing permissions to assigned clients when the toggle is on
-- (separate policy per table; SELECT policy for clients already exists)

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'brand_brains','brand_vocabulary','content_pillars',
    'brand_voice','words_to_avoid','approved_expressions','visual_directions'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Clients edit %I when enabled" ON public.%I', tbl, tbl);
    EXECUTE format($f$
      CREATE POLICY "Clients edit %1$I when enabled" ON public.%1$I
      AS PERMISSIVE
      FOR ALL
      TO authenticated
      USING (
        client_id IN (SELECT public.get_user_client_ids(auth.uid()))
        AND public.client_can_edit_brand_brain(client_id)
      )
      WITH CHECK (
        client_id IN (SELECT public.get_user_client_ids(auth.uid()))
        AND public.client_can_edit_brand_brain(client_id)
      )
    $f$, tbl);
  END LOOP;
END $$;