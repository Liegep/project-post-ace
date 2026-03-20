
-- Allow anonymous (public) read access to app_settings
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON public.app_settings;
CREATE POLICY "Anyone can read app_settings"
ON public.app_settings FOR SELECT TO anon, authenticated
USING (true);
