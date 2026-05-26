
-- =========================================================
-- app_settings: only super admins write; keep public read for logo
-- =========================================================
DROP POLICY IF EXISTS "Settings are publicly insertable" ON public.app_settings;
DROP POLICY IF EXISTS "Settings are publicly updatable" ON public.app_settings;
DROP POLICY IF EXISTS "Settings are publicly readable" ON public.app_settings;
DROP POLICY IF EXISTS "Anyone can read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can insert app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can update app_settings" ON public.app_settings;

CREATE POLICY "Anon read public app settings"
ON public.app_settings FOR SELECT TO anon
USING (key IN ('app_logo_url'));

CREATE POLICY "Authenticated read app settings"
ON public.app_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Super admins manage app settings"
ON public.app_settings FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- =========================================================
-- activity_logs: drop anon insert
-- =========================================================
DROP POLICY IF EXISTS "Anon can insert activity_logs" ON public.activity_logs;
-- Authenticated insert policy still exists.
-- Allow anon inserts ONLY when the row references an active approval token
CREATE POLICY "Anon insert activity_logs via approval token"
ON public.activity_logs FOR INSERT TO anon
WITH CHECK (
  client_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.approval_tokens t
    WHERE t.client_id = activity_logs.client_id
      AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
  )
);

-- =========================================================
-- clients: drop blanket anon read; allow anon only when approval token exists
-- =========================================================
DROP POLICY IF EXISTS "Anon read clients" ON public.clients;

CREATE POLICY "Anon read clients via approval token"
ON public.clients FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.approval_tokens t
    WHERE t.client_id = clients.id
      AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
  )
);

-- =========================================================
-- columns: drop blanket anon read
-- =========================================================
DROP POLICY IF EXISTS "Anon read columns" ON public.columns;

-- =========================================================
-- posts: drop blanket anon read; scope to approval tokens
-- =========================================================
DROP POLICY IF EXISTS "Anon read posts" ON public.posts;

CREATE POLICY "Anon read posts via approval token"
ON public.posts FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.approval_tokens t
    WHERE t.client_id = posts.client_id
      AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
      AND (t.token_type = 'batch' OR t.post_id = posts.id)
  )
);

-- Allow anon to update only client_label on posts referenced by an active token
CREATE POLICY "Anon update posts via approval token"
ON public.posts FOR UPDATE TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.approval_tokens t
    WHERE t.client_id = posts.client_id
      AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
      AND (t.token_type = 'batch' OR t.post_id = posts.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.approval_tokens t
    WHERE t.client_id = posts.client_id
      AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
      AND (t.token_type = 'batch' OR t.post_id = posts.id)
  )
);

-- =========================================================
-- comments: scope anon access to posts under an active approval token
-- =========================================================
DROP POLICY IF EXISTS "Anon insert comments" ON public.comments;
DROP POLICY IF EXISTS "Anon read comments" ON public.comments;

CREATE POLICY "Anon insert comments via approval token"
ON public.comments FOR INSERT TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.approval_tokens t
    JOIN public.posts p ON p.id = comments.post_id
    WHERE t.client_id = p.client_id
      AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
      AND (t.token_type = 'batch' OR t.post_id = p.id)
  )
);

-- =========================================================
-- content_briefs: drop public SELECT (team & admin policies still cover authed users)
-- =========================================================
DROP POLICY IF EXISTS "Clients view visible briefs" ON public.content_briefs;

-- =========================================================
-- text_contents: drop public SELECT (covered by team policy for authed clients)
-- =========================================================
DROP POLICY IF EXISTS "Clients view visible text_contents" ON public.text_contents;

-- =========================================================
-- text_content_comments
-- =========================================================
DROP POLICY IF EXISTS "Anyone can insert text_content_comments" ON public.text_content_comments;
DROP POLICY IF EXISTS "Public can view text_content_comments" ON public.text_content_comments;

CREATE POLICY "Authed insert text_content_comments for assigned clients"
ON public.text_content_comments FOR INSERT TO authenticated
WITH CHECK (
  text_content_id IN (
    SELECT id FROM public.text_contents
    WHERE client_id IN (SELECT get_user_client_ids(auth.uid()))
  )
);

-- =========================================================
-- brief_comments
-- =========================================================
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.brief_comments;
DROP POLICY IF EXISTS "Public can view comments" ON public.brief_comments;

CREATE POLICY "Authed insert brief_comments for assigned briefs"
ON public.brief_comments FOR INSERT TO authenticated
WITH CHECK (
  brief_id IN (
    SELECT id FROM public.content_briefs
    WHERE client_id IN (SELECT get_user_client_ids(auth.uid()))
  )
);

-- =========================================================
-- social_posts: drop anon-role policy intended for service role
-- =========================================================
DROP POLICY IF EXISTS "Service role can manage social_posts" ON public.social_posts;
-- Edge functions using service_role key bypass RLS automatically.

-- =========================================================
-- tags: lock down public access
-- =========================================================
DROP POLICY IF EXISTS "Tags are publicly deletable" ON public.tags;
DROP POLICY IF EXISTS "Tags are publicly insertable" ON public.tags;
DROP POLICY IF EXISTS "Tags are publicly readable" ON public.tags;
DROP POLICY IF EXISTS "Tags are publicly updatable" ON public.tags;

CREATE POLICY "Authed read tags for assigned clients"
ON public.tags FOR SELECT TO authenticated
USING (client_id IS NULL OR client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Authed insert tags for assigned clients"
ON public.tags FOR INSERT TO authenticated
WITH CHECK (client_id IS NULL OR client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Authed update tags for assigned clients"
ON public.tags FOR UPDATE TO authenticated
USING (client_id IS NULL OR client_id IN (SELECT get_user_client_ids(auth.uid())))
WITH CHECK (client_id IS NULL OR client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Admins delete tags"
ON public.tags FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (client_id IS NULL OR client_id IN (SELECT get_user_client_ids(auth.uid())))
);

-- =========================================================
-- post_tracking: lock down public access
-- =========================================================
DROP POLICY IF EXISTS "Post tracking is publicly insertable" ON public.post_tracking;
DROP POLICY IF EXISTS "Post tracking is publicly readable" ON public.post_tracking;
DROP POLICY IF EXISTS "Post tracking is publicly updatable" ON public.post_tracking;

CREATE POLICY "Authed manage post_tracking for assigned clients"
ON public.post_tracking FOR ALL TO authenticated
USING (
  post_id IN (
    SELECT id FROM public.posts
    WHERE client_id IN (SELECT get_user_client_ids(auth.uid()))
  )
)
WITH CHECK (
  post_id IN (
    SELECT id FROM public.posts
    WHERE client_id IN (SELECT get_user_client_ids(auth.uid()))
  )
);

-- =========================================================
-- tracking_order
-- =========================================================
DROP POLICY IF EXISTS "Tracking order is publicly insertable" ON public.tracking_order;
DROP POLICY IF EXISTS "Tracking order is publicly readable" ON public.tracking_order;
DROP POLICY IF EXISTS "Tracking order is publicly updatable" ON public.tracking_order;

CREATE POLICY "Authed manage tracking_order for assigned clients"
ON public.tracking_order FOR ALL TO authenticated
USING (client_id IN (SELECT get_user_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_user_client_ids(auth.uid())));

-- =========================================================
-- tracking_steps
-- =========================================================
DROP POLICY IF EXISTS "Tracking steps are publicly deletable" ON public.tracking_steps;
DROP POLICY IF EXISTS "Tracking steps are publicly insertable" ON public.tracking_steps;
DROP POLICY IF EXISTS "Tracking steps are publicly readable" ON public.tracking_steps;
DROP POLICY IF EXISTS "Tracking steps are publicly updatable" ON public.tracking_steps;

CREATE POLICY "Authed read tracking_steps for assigned clients"
ON public.tracking_steps FOR SELECT TO authenticated
USING (client_id IS NULL OR client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Authed insert tracking_steps for assigned clients"
ON public.tracking_steps FOR INSERT TO authenticated
WITH CHECK (client_id IS NULL OR client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Authed update tracking_steps for assigned clients"
ON public.tracking_steps FOR UPDATE TO authenticated
USING (client_id IS NULL OR client_id IN (SELECT get_user_client_ids(auth.uid())))
WITH CHECK (client_id IS NULL OR client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Admins delete tracking_steps"
ON public.tracking_steps FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- storage.objects: lock down media bucket writes
-- =========================================================
DROP POLICY IF EXISTS "Anyone can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete media" ON storage.objects;

CREATE POLICY "Authed upload media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media');

CREATE POLICY "Authed update media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media')
WITH CHECK (bucket_id = 'media');

CREATE POLICY "Authed delete media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media');

-- =========================================================
-- proposals: replace public RLS with token-gated SECURITY DEFINER functions
-- =========================================================
DROP POLICY IF EXISTS "Public view proposals by token" ON public.proposals;
DROP POLICY IF EXISTS "Public update proposals for acceptance" ON public.proposals;

CREATE OR REPLACE FUNCTION public.get_proposal_by_token(p_token text)
RETURNS public.proposals
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.proposals WHERE token = p_token LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.mark_proposal_viewed(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.proposals
  SET status = 'viewed', viewed_at = now()
  WHERE token = p_token
    AND status IN ('sent', 'draft');
$$;

CREATE OR REPLACE FUNCTION public.mark_proposal_expired(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.proposals
  SET status = 'expired'
  WHERE token = p_token
    AND status <> 'expired'
    AND expires_at < now();
$$;

CREATE OR REPLACE FUNCTION public.accept_proposal(
  p_token text,
  p_name text,
  p_email text,
  p_signature text,
  p_ip text
)
RETURNS public.proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.proposals;
BEGIN
  UPDATE public.proposals
  SET status = 'accepted',
      accepted_at = now(),
      accepted_name = p_name,
      accepted_email = p_email,
      accepted_signature = p_signature,
      accepted_ip = p_ip
  WHERE token = p_token
    AND status IN ('sent', 'draft', 'viewed')
    AND (expires_at IS NULL OR expires_at > now())
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- Restrict execute to anon (used by public proposal page) and authenticated.
REVOKE ALL ON FUNCTION public.get_proposal_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_proposal_viewed(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_proposal_expired(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_proposal(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_proposal_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_proposal_viewed(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_proposal_expired(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_proposal(text, text, text, text, text) TO anon, authenticated;
