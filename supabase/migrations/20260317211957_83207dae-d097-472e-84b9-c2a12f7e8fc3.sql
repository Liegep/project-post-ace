
CREATE TABLE public.tracking_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  post_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

ALTER TABLE public.tracking_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tracking order is publicly readable"
  ON public.tracking_order FOR SELECT TO public USING (true);

CREATE POLICY "Tracking order is publicly insertable"
  ON public.tracking_order FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Tracking order is publicly updatable"
  ON public.tracking_order FOR UPDATE TO public USING (true);
