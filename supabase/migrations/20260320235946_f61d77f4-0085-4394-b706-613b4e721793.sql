
CREATE TABLE public.client_seen_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL, -- 'invoice' or 'report'
  item_id uuid NOT NULL,
  seen_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

ALTER TABLE public.client_seen_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own seen items"
  ON public.client_seen_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own seen items"
  ON public.client_seen_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
