
-- Enum for brief status
CREATE TYPE public.brief_status AS ENUM (
  'draft',
  'internal',
  'pending_approval',
  'approved',
  'rejected',
  'published'
);

-- Content briefs table
CREATE TABLE public.content_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  planned_date date,
  content_type text NOT NULL DEFAULT 'post',
  status public.brief_status NOT NULL DEFAULT 'draft',
  assigned_to uuid,
  internal_notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Brief comments table (client feedback)
CREATE TABLE public.brief_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.content_briefs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text NOT NULL DEFAULT '',
  author_role text NOT NULL DEFAULT 'client',
  message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Brief attachments
CREATE TABLE public.brief_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.content_briefs(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brief_attachments ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can do everything on briefs
CREATE POLICY "Admins manage all briefs"
  ON public.content_briefs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Team members can see/edit briefs for their assigned clients
CREATE POLICY "Team view assigned briefs"
  ON public.content_briefs FOR SELECT
  TO authenticated
  USING (client_id IN (SELECT public.get_user_client_ids(auth.uid())));

CREATE POLICY "Team update assigned briefs"
  ON public.content_briefs FOR UPDATE
  TO authenticated
  USING (client_id IN (SELECT public.get_user_client_ids(auth.uid())));

CREATE POLICY "Team insert assigned briefs"
  ON public.content_briefs FOR INSERT
  TO authenticated
  WITH CHECK (client_id IN (SELECT public.get_user_client_ids(auth.uid())));

-- RLS: Public (client) can only see briefs with status pending_approval, approved, rejected, published
CREATE POLICY "Clients view visible briefs"
  ON public.content_briefs FOR SELECT
  TO anon, public
  USING (status IN ('pending_approval', 'approved', 'rejected', 'published'));

-- RLS: Brief comments
CREATE POLICY "Admins manage brief comments"
  ON public.brief_comments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team view comments on assigned briefs"
  ON public.brief_comments FOR SELECT
  TO authenticated
  USING (brief_id IN (
    SELECT id FROM public.content_briefs
    WHERE client_id IN (SELECT public.get_user_client_ids(auth.uid()))
  ));

CREATE POLICY "Anyone can insert comments"
  ON public.brief_comments FOR INSERT
  TO authenticated, anon, public
  WITH CHECK (true);

CREATE POLICY "Public can view comments"
  ON public.brief_comments FOR SELECT
  TO anon, public
  USING (true);

-- RLS: Brief attachments
CREATE POLICY "Admins manage brief attachments"
  ON public.brief_attachments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Team view attachments on assigned briefs"
  ON public.brief_attachments FOR SELECT
  TO authenticated
  USING (brief_id IN (
    SELECT id FROM public.content_briefs
    WHERE client_id IN (SELECT public.get_user_client_ids(auth.uid()))
  ));

CREATE POLICY "Public can view attachments"
  ON public.brief_attachments FOR SELECT
  TO anon, public
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_content_briefs_updated_at
  BEFORE UPDATE ON public.content_briefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
