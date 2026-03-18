-- Allow client-role users to view their own assignments
CREATE POLICY "Client users can view own assignments"
  ON public.user_client_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'client'
  ));