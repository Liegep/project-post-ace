
-- Create enum for calendar post status
CREATE TYPE public.calendar_post_status AS ENUM ('draft', 'in_review', 'approved', 'scheduled', 'published');

-- Create calendar_posts table
CREATE TABLE public.calendar_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  caption text NOT NULL DEFAULT '',
  media_urls text[] NOT NULL DEFAULT '{}'::text[],
  media_type text NOT NULL DEFAULT 'image',
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  publish_date date NOT NULL,
  publish_time time WITHOUT TIME ZONE NOT NULL DEFAULT '09:00',
  status public.calendar_post_status NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_posts ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins manage calendar_posts"
ON public.calendar_posts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Team members can view assigned client posts
CREATE POLICY "Team view assigned calendar_posts"
ON public.calendar_posts FOR SELECT
TO authenticated
USING (client_id IN (SELECT public.get_user_client_ids(auth.uid())));

-- Team members can insert for assigned clients
CREATE POLICY "Team insert assigned calendar_posts"
ON public.calendar_posts FOR INSERT
TO authenticated
WITH CHECK (client_id IN (SELECT public.get_user_client_ids(auth.uid())));

-- Team members can update assigned client posts
CREATE POLICY "Team update assigned calendar_posts"
ON public.calendar_posts FOR UPDATE
TO authenticated
USING (client_id IN (SELECT public.get_user_client_ids(auth.uid())));

-- Trigger for updated_at
CREATE TRIGGER update_calendar_posts_updated_at
  BEFORE UPDATE ON public.calendar_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
