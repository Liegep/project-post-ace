
-- ============ CLIENTS ============
DROP POLICY IF EXISTS "Clients are publicly readable" ON public.clients;
DROP POLICY IF EXISTS "Clients are publicly insertable" ON public.clients;
DROP POLICY IF EXISTS "Clients are publicly updatable" ON public.clients;
DROP POLICY IF EXISTS "Clients are publicly deletable" ON public.clients;

-- Super admins: full access
CREATE POLICY "Super admins manage all clients"
ON public.clients FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- Team members: read assigned/owned clients
CREATE POLICY "Team view assigned clients"
ON public.clients FOR SELECT TO authenticated
USING (
  id IN (SELECT get_user_client_ids(auth.uid()))
  OR owner_id = auth.uid()
);

-- Team members: insert (they become owner)
CREATE POLICY "Team insert clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Team members: update assigned/owned clients
CREATE POLICY "Team update assigned clients"
ON public.clients FOR UPDATE TO authenticated
USING (
  id IN (SELECT get_user_client_ids(auth.uid()))
  OR owner_id = auth.uid()
);

-- Team members: delete own clients
CREATE POLICY "Team delete own clients"
ON public.clients FOR DELETE TO authenticated
USING (owner_id = auth.uid());

-- Anon: read clients (for approval/public pages)
CREATE POLICY "Anon read clients"
ON public.clients FOR SELECT TO anon
USING (true);

-- ============ COLUMNS ============
DROP POLICY IF EXISTS "Columns are publicly readable" ON public.columns;
DROP POLICY IF EXISTS "Columns are publicly insertable" ON public.columns;
DROP POLICY IF EXISTS "Columns are publicly updatable" ON public.columns;
DROP POLICY IF EXISTS "Columns are publicly deletable" ON public.columns;

CREATE POLICY "Super admins manage all columns"
ON public.columns FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Team manage assigned columns"
ON public.columns FOR ALL TO authenticated
USING (client_id IN (SELECT get_user_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Anon read columns"
ON public.columns FOR SELECT TO anon
USING (true);

-- ============ POSTS ============
-- First check existing policies
DROP POLICY IF EXISTS "Posts are publicly readable" ON public.posts;
DROP POLICY IF EXISTS "Posts are publicly insertable" ON public.posts;
DROP POLICY IF EXISTS "Posts are publicly updatable" ON public.posts;
DROP POLICY IF EXISTS "Posts are publicly deletable" ON public.posts;

CREATE POLICY "Super admins manage all posts"
ON public.posts FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Team manage assigned posts"
ON public.posts FOR ALL TO authenticated
USING (client_id IN (SELECT get_user_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Anon read posts"
ON public.posts FOR SELECT TO anon
USING (true);

-- ============ COMMENTS ============
DROP POLICY IF EXISTS "Comments are publicly readable" ON public.comments;
DROP POLICY IF EXISTS "Comments are publicly insertable" ON public.comments;
DROP POLICY IF EXISTS "Comments are publicly deletable" ON public.comments;

CREATE POLICY "Super admins manage all comments"
ON public.comments FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Team view assigned comments"
ON public.comments FOR SELECT TO authenticated
USING (post_id IN (SELECT id FROM posts WHERE client_id IN (SELECT get_user_client_ids(auth.uid()))));

CREATE POLICY "Team insert assigned comments"
ON public.comments FOR INSERT TO authenticated
WITH CHECK (post_id IN (SELECT id FROM posts WHERE client_id IN (SELECT get_user_client_ids(auth.uid()))));

CREATE POLICY "Team delete assigned comments"
ON public.comments FOR DELETE TO authenticated
USING (post_id IN (SELECT id FROM posts WHERE client_id IN (SELECT get_user_client_ids(auth.uid()))));

CREATE POLICY "Anon read comments"
ON public.comments FOR SELECT TO anon
USING (true);

CREATE POLICY "Anon insert comments"
ON public.comments FOR INSERT TO anon
WITH CHECK (true);

-- ============ HASHTAG_GROUPS ============
DROP POLICY IF EXISTS "Hashtag groups are publicly readable" ON public.hashtag_groups;
DROP POLICY IF EXISTS "Hashtag groups are publicly insertable" ON public.hashtag_groups;
DROP POLICY IF EXISTS "Hashtag groups are publicly updatable" ON public.hashtag_groups;
DROP POLICY IF EXISTS "Hashtag groups are publicly deletable" ON public.hashtag_groups;

CREATE POLICY "Super admins manage all hashtag_groups"
ON public.hashtag_groups FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Team manage assigned hashtag_groups"
ON public.hashtag_groups FOR ALL TO authenticated
USING (client_id IN (SELECT get_user_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_user_client_ids(auth.uid())));
