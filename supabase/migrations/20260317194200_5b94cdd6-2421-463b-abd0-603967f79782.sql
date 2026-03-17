
-- Add unique constraint for meta_pages upsert
ALTER TABLE public.meta_pages ADD CONSTRAINT meta_pages_account_page_platform_unique UNIQUE (meta_account_id, page_id, platform);

-- Service role policy for social_logs (scheduler needs to insert)
CREATE POLICY "Service role can insert social_logs" ON public.social_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Service role can manage social_posts" ON public.social_posts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Service role can insert history" ON public.social_post_history FOR INSERT TO anon WITH CHECK (true);
