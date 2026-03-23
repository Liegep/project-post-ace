
-- Create text content type enum
CREATE TYPE public.text_content_type AS ENUM ('blog', 'artigo', 'texto', 'copy', 'documento');

-- Create text content status enum
CREATE TYPE public.text_content_status AS ENUM ('draft', 'internal', 'pending_approval', 'approved', 'rejected', 'published');

-- Create text_contents table
CREATE TABLE public.text_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  content_type text_content_type NOT NULL DEFAULT 'texto',
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status text_content_status NOT NULL DEFAULT 'draft',
  planned_date DATE,
  observations TEXT NOT NULL DEFAULT '',
  client_label TEXT NOT NULL DEFAULT 'pendente',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create text content comments table
CREATE TABLE public.text_content_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text_content_id UUID NOT NULL REFERENCES public.text_contents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  author_role TEXT NOT NULL DEFAULT 'client',
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.text_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_content_comments ENABLE ROW LEVEL SECURITY;

-- RLS for text_contents
CREATE POLICY "Admins manage text_contents" ON public.text_contents FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team view assigned text_contents" ON public.text_contents FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Team insert assigned text_contents" ON public.text_contents FOR INSERT TO authenticated
  WITH CHECK (client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Team update assigned text_contents" ON public.text_contents FOR UPDATE TO authenticated
  USING (client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Clients view visible text_contents" ON public.text_contents FOR SELECT TO public
  USING (status IN ('pending_approval', 'approved', 'rejected', 'published'));

-- RLS for text_content_comments
CREATE POLICY "Admins manage text_content_comments" ON public.text_content_comments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert text_content_comments" ON public.text_content_comments FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Public can view text_content_comments" ON public.text_content_comments FOR SELECT TO public
  USING (true);

CREATE POLICY "Team view text_content_comments" ON public.text_content_comments FOR SELECT TO authenticated
  USING (text_content_id IN (SELECT id FROM public.text_contents WHERE client_id IN (SELECT get_user_client_ids(auth.uid()))));
