
-- Add tracking_enabled to clients
ALTER TABLE public.clients ADD COLUMN tracking_enabled boolean NOT NULL DEFAULT false;

-- Tracking steps template per client
CREATE TABLE public.tracking_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tracking_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracking steps are publicly readable" ON public.tracking_steps FOR SELECT TO public USING (true);
CREATE POLICY "Tracking steps are publicly insertable" ON public.tracking_steps FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Tracking steps are publicly updatable" ON public.tracking_steps FOR UPDATE TO public USING (true);
CREATE POLICY "Tracking steps are publicly deletable" ON public.tracking_steps FOR DELETE TO public USING (true);

-- Post tracking completion per step
CREATE TABLE public.post_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES public.tracking_steps(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(post_id, step_id)
);

ALTER TABLE public.post_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post tracking is publicly readable" ON public.post_tracking FOR SELECT TO public USING (true);
CREATE POLICY "Post tracking is publicly insertable" ON public.post_tracking FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Post tracking is publicly updatable" ON public.post_tracking FOR UPDATE TO public USING (true);
