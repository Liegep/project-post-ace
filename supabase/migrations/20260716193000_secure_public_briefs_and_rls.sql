-- =========================================================
-- design briefs: replace public token table reads with token-gated RPCs
-- =========================================================
DROP POLICY IF EXISTS "Anon read active tokens" ON public.design_brief_tokens;
DROP POLICY IF EXISTS "Anon read briefs via token" ON public.design_briefs;
DROP POLICY IF EXISTS "Anon can update briefs via token" ON public.design_briefs;

REVOKE SELECT ON public.design_brief_tokens FROM anon;
REVOKE UPDATE ON public.design_briefs FROM anon;

CREATE OR REPLACE FUNCTION public.get_public_brief_by_token(p_token text)
RETURNS public.design_briefs
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.*
  FROM public.design_briefs b
  JOIN public.design_brief_tokens t ON t.brief_id = b.id
  WHERE t.token = p_token
    AND t.active = true
    AND t.expires_at > now()
  ORDER BY t.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_brief_by_token(
  p_token text,
  p_answers jsonb,
  p_respondent_name text,
  p_respondent_email text
)
RETURNS public.design_briefs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brief_id uuid;
  v_result public.design_briefs;
BEGIN
  SELECT t.brief_id
  INTO v_brief_id
  FROM public.design_brief_tokens t
  WHERE t.token = p_token
    AND t.active = true
    AND t.expires_at > now()
  ORDER BY t.created_at DESC
  LIMIT 1;

  IF v_brief_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.design_briefs
  SET answers = COALESCE(p_answers, '{}'::jsonb),
      respondent_name = COALESCE(trim(p_respondent_name), ''),
      respondent_email = COALESCE(trim(p_respondent_email), ''),
      submitted_at = now()
  WHERE id = v_brief_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_brief_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_public_brief_by_token(text, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_brief_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_brief_by_token(text, jsonb, text, text) TO anon, authenticated;

-- =========================================================
-- activity_logs: scope authenticated inserts to the caller and their clients
-- =========================================================
DROP POLICY IF EXISTS "Authenticated can insert activity_logs" ON public.activity_logs;

CREATE POLICY "Authenticated can insert scoped activity_logs"
ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    client_id IS NULL
    OR client_id IN (SELECT public.get_user_client_ids(auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'colaborador'::app_role)
  )
);

-- =========================================================
-- admin_notifications: block arbitrary inserts to unrelated users
-- =========================================================
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.admin_notifications;

CREATE POLICY "Authenticated can insert scoped notifications"
ON public.admin_notifications FOR INSERT TO authenticated
WITH CHECK (
  (
    (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'colaborador'::app_role)
    )
    AND (
      client_id IS NULL
      OR client_id IN (SELECT public.get_user_client_ids(auth.uid()))
    )
    AND (
      post_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.posts p
        WHERE p.id = admin_notifications.post_id
          AND (
            admin_notifications.client_id IS NULL
            OR p.client_id = admin_notifications.client_id
          )
      )
    )
    AND (
      user_id IS NULL
      OR (
        admin_notifications.client_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.user_client_assignments uca
          WHERE uca.user_id = admin_notifications.user_id
            AND uca.client_id = admin_notifications.client_id
        )
      )
    )
  )
  OR
  (
    public.has_role(auth.uid(), 'client'::app_role)
    AND client_id IN (SELECT public.get_user_client_ids(auth.uid()))
    AND user_id IS NULL
    AND (
      post_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.posts p
        WHERE p.id = admin_notifications.post_id
          AND p.client_id = admin_notifications.client_id
      )
    )
  )
);
