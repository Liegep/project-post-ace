
-- Fix 1: approval_actions - remove cross-tenant read for authenticated users
DROP POLICY IF EXISTS "Authenticated can read approval actions" ON public.approval_actions;
DROP POLICY IF EXISTS "Anon read approval_actions via active token" ON public.approval_actions;

-- Recreate anon-only token-based read (scoped to anon role only)
CREATE POLICY "Anon read approval_actions via active token"
ON public.approval_actions
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.approval_tokens t
    WHERE t.id = approval_actions.token_id
      AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
  )
);

-- Authenticated users keep read access only via existing "Team can view assigned approval_actions"
-- and "Admins manage approval_actions" policies, which scope by client assignment / admin role.

-- Also scope the anon INSERT to TO anon explicitly (it currently applies to PUBLIC)
DROP POLICY IF EXISTS "Anon insert approval_actions via active token" ON public.approval_actions;
CREATE POLICY "Anon insert approval_actions via active token"
ON public.approval_actions
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.approval_tokens t
    WHERE t.id = approval_actions.token_id
      AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
  )
);

-- Allow authenticated users to insert approval actions for posts in their assigned clients
-- (so the existing in-app approval flow keeps working for client users with accounts).
CREATE POLICY "Authenticated insert approval_actions for assigned clients"
ON public.approval_actions
FOR INSERT
TO authenticated
WITH CHECK (
  post_id IN (
    SELECT p.id FROM public.posts p
    WHERE p.client_id IN (SELECT public.get_user_client_ids(auth.uid()))
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Fix 2: realtime.messages - restrict to postgres_changes only (no broadcast/presence)
DROP POLICY IF EXISTS "Authenticated can use realtime" ON realtime.messages;
CREATE POLICY "Authenticated can use realtime postgres_changes only"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND extension = 'postgres_changes'
);
