
-- 1. admin_invitations: add DELETE policy for super_admins (and admins) and purge accepted/expired
CREATE POLICY "Super admins can delete invitations"
ON public.admin_invitations
FOR DELETE
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 2. social_report_templates: restrict SELECT to internal roles only
DROP POLICY IF EXISTS "Authenticated can view templates" ON public.social_report_templates;
CREATE POLICY "Internal roles can view templates"
ON public.social_report_templates
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'team_member')
  OR public.is_super_admin(auth.uid())
);

-- 3. posts: restrict anon UPDATE to only the approval-related column (client_label) via column-level GRANTs
REVOKE UPDATE ON public.posts FROM anon;
GRANT UPDATE (client_label) ON public.posts TO anon;
