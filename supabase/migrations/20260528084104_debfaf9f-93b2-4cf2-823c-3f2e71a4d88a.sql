
-- 1. approval_actions: scope anon access by valid active token
DROP POLICY IF EXISTS "Anon can read approval_actions" ON public.approval_actions;
DROP POLICY IF EXISTS "Anon can insert approval_actions" ON public.approval_actions;

CREATE POLICY "Anon read approval_actions via active token"
ON public.approval_actions FOR SELECT TO anon
USING (EXISTS (
  SELECT 1 FROM public.approval_tokens t
  WHERE t.id = approval_actions.token_id
    AND t.active = true
    AND (t.expires_at IS NULL OR t.expires_at > now())
));

CREATE POLICY "Anon insert approval_actions via active token"
ON public.approval_actions FOR INSERT TO anon
WITH CHECK (EXISTS (
  SELECT 1 FROM public.approval_tokens t
  WHERE t.id = approval_actions.token_id
    AND t.active = true
    AND (t.expires_at IS NULL OR t.expires_at > now())
));

-- 2. brief_attachments: remove public read
DROP POLICY IF EXISTS "Public can view attachments" ON public.brief_attachments;

-- 3. client_links: remove public read, restrict to assigned team
DROP POLICY IF EXISTS "Client links are publicly readable" ON public.client_links;

CREATE POLICY "Team view assigned client_links"
ON public.client_links FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR client_id IN (SELECT get_user_client_ids(auth.uid()))
);

-- 4. clients: remove anon access, use SECURITY DEFINER RPC instead
DROP POLICY IF EXISTS "Anon read clients via approval token" ON public.clients;

CREATE OR REPLACE FUNCTION public.get_client_by_approval_token(p_token text)
RETURNS TABLE (id uuid, name text, logo_url text, locale text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.logo_url, c.locale
  FROM public.clients c
  JOIN public.approval_tokens t ON t.client_id = c.id
  WHERE t.token = p_token
    AND t.active = true
    AND (t.expires_at IS NULL OR t.expires_at > now())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_by_approval_token(text) TO anon, authenticated;

-- 5. social_logs: restrict insert to service_role
DROP POLICY IF EXISTS "Service role can insert social_logs" ON public.social_logs;
CREATE POLICY "Service role can insert social_logs"
ON public.social_logs FOR INSERT TO service_role
WITH CHECK (true);

-- 6. social_post_history: restrict insert to service_role
DROP POLICY IF EXISTS "Service role can insert history" ON public.social_post_history;
CREATE POLICY "Service role can insert history"
ON public.social_post_history FOR INSERT TO service_role
WITH CHECK (true);

-- 7. Storage: restrict app-branding writes to admins
DROP POLICY IF EXISTS "Authenticated users can upload app branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update app branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete app branding" ON storage.objects;

CREATE POLICY "Admins upload app branding"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'app-branding' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update app branding"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'app-branding' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete app branding"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'app-branding' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 8. Storage: restrict media bucket update/delete to admin/team_member (uploads still open to authenticated)
DROP POLICY IF EXISTS "Authed update media" ON storage.objects;
DROP POLICY IF EXISTS "Authed delete media" ON storage.objects;

CREATE POLICY "Team update media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'media'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'team_member'::app_role)
    OR owner = auth.uid()
  )
);

CREATE POLICY "Team delete media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'media'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'team_member'::app_role)
    OR owner = auth.uid()
  )
);

-- 9. realtime: require authentication on realtime.messages broadcast
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can use realtime" ON realtime.messages';
    EXECUTE 'CREATE POLICY "Authenticated can use realtime" ON realtime.messages FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;
