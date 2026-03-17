
-- Social scheduling module tables

-- Meta connected accounts (OAuth tokens)
CREATE TABLE public.meta_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  meta_user_id TEXT NOT NULL,
  meta_user_name TEXT NOT NULL DEFAULT '',
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(client_id, meta_user_id)
);

-- Facebook Pages and Instagram accounts linked to a meta_account
CREATE TABLE public.meta_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_account_id UUID REFERENCES public.meta_accounts(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL DEFAULT '',
  page_access_token TEXT NOT NULL,
  instagram_account_id TEXT,
  instagram_username TEXT,
  platform TEXT NOT NULL DEFAULT 'facebook', -- 'facebook' or 'instagram'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Social posts for scheduling
CREATE TYPE public.social_post_status AS ENUM ('draft', 'pending_approval', 'approved', 'scheduled', 'publishing', 'published', 'error', 'cancelled');

CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  meta_page_id UUID REFERENCES public.meta_pages(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'facebook',
  status public.social_post_status NOT NULL DEFAULT 'draft',
  caption TEXT NOT NULL DEFAULT '',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  media_type TEXT NOT NULL DEFAULT 'image', -- image, carousel, video, reel
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  meta_post_id TEXT, -- ID returned by Meta after publishing/scheduling
  notes TEXT NOT NULL DEFAULT '',
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Status history for audit trail
CREATE TABLE public.social_post_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  social_post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  old_status public.social_post_status,
  new_status public.social_post_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Publication logs with detailed error info
CREATE TABLE public.social_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  social_post_id UUID REFERENCES public.social_posts(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- 'publish', 'schedule', 'cancel', 'retry', 'token_refresh'
  success BOOLEAN NOT NULL DEFAULT false,
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meta_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin-only access)
CREATE POLICY "Admins can manage meta_accounts" ON public.meta_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage meta_pages" ON public.meta_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage social_posts" ON public.social_posts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view social_post_history" ON public.social_post_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert social_post_history" ON public.social_post_history FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view social_logs" ON public.social_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at on social_posts
CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_meta_accounts_updated_at BEFORE UPDATE ON public.meta_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for social_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
