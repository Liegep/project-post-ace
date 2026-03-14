-- Create tags table
CREATE TABLE public.tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tags are publicly readable" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Tags are publicly insertable" ON public.tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Tags are publicly deletable" ON public.tags FOR DELETE USING (true);
CREATE POLICY "Tags are publicly updatable" ON public.tags FOR UPDATE USING (true);

-- Insert default tags
INSERT INTO public.tags (id, name, color) VALUES
  ('seo', 'SEO', '#3b82f6'),
  ('alterado', 'Alterado', '#f59e0b'),
  ('agendado', 'Agendado', '#8b5cf6'),
  ('publicado', 'Publicado', '#22c55e');

-- Create posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT NOT NULL DEFAULT '',
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_desenvolvimento',
  client_label TEXT NOT NULL DEFAULT 'pendente',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are publicly readable" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Posts are publicly insertable" ON public.posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Posts are publicly updatable" ON public.posts FOR UPDATE USING (true);
CREATE POLICY "Posts are publicly deletable" ON public.posts FOR DELETE USING (true);

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are publicly readable" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Comments are publicly insertable" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Comments are publicly deletable" ON public.comments FOR DELETE USING (true);

-- Create app_settings table for posting period etc.
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings are publicly readable" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Settings are publicly updatable" ON public.app_settings FOR UPDATE USING (true);
CREATE POLICY "Settings are publicly insertable" ON public.app_settings FOR INSERT WITH CHECK (true);

-- Insert default posting period
INSERT INTO public.app_settings (key, value) VALUES ('posting_period', 'Março 2026');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);
CREATE POLICY "Media is publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Anyone can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
CREATE POLICY "Anyone can update media" ON storage.objects FOR UPDATE USING (bucket_id = 'media');
CREATE POLICY "Anyone can delete media" ON storage.objects FOR DELETE USING (bucket_id = 'media');