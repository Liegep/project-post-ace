
CREATE POLICY "Authenticated can read active approval tokens"
ON public.approval_tokens FOR SELECT TO authenticated
USING (active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Authenticated can read posts via approval"
ON public.posts FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.approval_tokens t
    WHERE t.client_id = posts.client_id
      AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
  )
);

CREATE POLICY "Authenticated can read approval actions"
ON public.approval_actions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.approval_tokens t
    WHERE t.id = approval_actions.token_id
      AND t.active = true
      AND (t.expires_at IS NULL OR t.expires_at > now())
  )
);
