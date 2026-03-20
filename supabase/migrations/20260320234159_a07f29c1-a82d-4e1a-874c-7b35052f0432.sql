
-- Create storage bucket for app branding assets
INSERT INTO storage.buckets (id, name, public) VALUES ('app-branding', 'app-branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to app-branding bucket
CREATE POLICY "Authenticated users can upload app branding"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'app-branding');

-- Allow authenticated users to update app branding files
CREATE POLICY "Authenticated users can update app branding"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'app-branding');

-- Allow public read access to app branding
CREATE POLICY "Public read access to app branding"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'app-branding');

-- Allow authenticated users to delete app branding files
CREATE POLICY "Authenticated users can delete app branding"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'app-branding');

-- RLS for app_settings: authenticated can read and upsert
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read app_settings"
ON public.app_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert app_settings"
ON public.app_settings FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update app_settings"
ON public.app_settings FOR UPDATE TO authenticated
USING (true);
