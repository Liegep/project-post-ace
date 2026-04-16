
-- Allow team members to manage automations on their assigned clients
CREATE POLICY "Team manage assigned automations"
ON public.kanban_automations
FOR ALL
TO authenticated
USING (client_id IN (SELECT get_user_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_user_client_ids(auth.uid())));
