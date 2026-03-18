CREATE POLICY "Admins can delete briefs"
ON public.content_briefs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team can delete assigned briefs"
ON public.content_briefs
FOR DELETE
TO authenticated
USING (client_id IN (SELECT get_user_client_ids(auth.uid())));