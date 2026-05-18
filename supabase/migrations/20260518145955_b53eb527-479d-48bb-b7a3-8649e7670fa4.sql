CREATE POLICY "Clients can view assigned brief_templates"
ON public.brief_templates
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.brief_assignments ba
    WHERE ba.template_id = brief_templates.id
      AND ba.client_id IN (SELECT public.get_user_client_ids(auth.uid()))
  )
);