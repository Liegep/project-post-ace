
-- Create clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text NOT NULL DEFAULT '',
  locale text NOT NULL DEFAULT 'pt',
  posting_period text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching existing pattern)
CREATE POLICY "Clients are publicly readable" ON public.clients FOR SELECT TO public USING (true);
CREATE POLICY "Clients are publicly insertable" ON public.clients FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Clients are publicly updatable" ON public.clients FOR UPDATE TO public USING (true);
CREATE POLICY "Clients are publicly deletable" ON public.clients FOR DELETE TO public USING (true);

-- Add client_id to posts table
ALTER TABLE public.posts ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Add client_id to comments (optional, inherited through posts)
-- Add client_id to tags
ALTER TABLE public.tags ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;
