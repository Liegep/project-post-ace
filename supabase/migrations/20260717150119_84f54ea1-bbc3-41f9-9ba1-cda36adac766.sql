CREATE POLICY "Super admins manage all tags"
ON public.tags
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));