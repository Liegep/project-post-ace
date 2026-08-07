
CREATE OR REPLACE FUNCTION public.token_allows_post(_post_id uuid, _client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.approval_tokens t
    WHERE t.client_id = _client_id
      AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
      AND (t.token_type = 'batch' OR t.post_id = _post_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.token_id_is_active(_token_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.approval_tokens t
    WHERE t.id = _token_id AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
  )
$$;

CREATE OR REPLACE FUNCTION public.client_has_active_token(_client_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.approval_tokens t
    WHERE t.client_id = _client_id AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
  )
$$;

CREATE OR REPLACE FUNCTION public.token_allows_comment_on_post(_post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.approval_tokens t
    JOIN public.posts p ON p.id = _post_id
    WHERE t.client_id = p.client_id
      AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
      AND (t.token_type = 'batch' OR t.post_id = p.id)
  )
$$;

DROP POLICY IF EXISTS "Anon read posts via approval token" ON public.posts;
CREATE POLICY "Anon read posts via approval token" ON public.posts FOR SELECT TO anon
USING (public.token_allows_post(id, client_id));

DROP POLICY IF EXISTS "Anon update posts via approval token" ON public.posts;
CREATE POLICY "Anon update posts via approval token" ON public.posts FOR UPDATE TO anon
USING (public.token_allows_post(id, client_id))
WITH CHECK (public.token_allows_post(id, client_id));

DROP POLICY IF EXISTS "Anon read approval_actions via active token" ON public.approval_actions;
CREATE POLICY "Anon read approval_actions via active token" ON public.approval_actions FOR SELECT TO anon
USING (public.token_id_is_active(token_id));

DROP POLICY IF EXISTS "Anon insert approval_actions via active token" ON public.approval_actions;
CREATE POLICY "Anon insert approval_actions via active token" ON public.approval_actions FOR INSERT TO anon
WITH CHECK (public.token_id_is_active(token_id));

DROP POLICY IF EXISTS "Anon insert comments via approval token" ON public.comments;
CREATE POLICY "Anon insert comments via approval token" ON public.comments FOR INSERT TO anon
WITH CHECK (public.token_allows_comment_on_post(post_id));

DROP POLICY IF EXISTS "Anon insert activity_logs via approval token" ON public.activity_logs;
CREATE POLICY "Anon insert activity_logs via approval token" ON public.activity_logs FOR INSERT TO anon
WITH CHECK (client_id IS NOT NULL AND public.client_has_active_token(client_id));
