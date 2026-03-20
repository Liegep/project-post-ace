
-- Invoice status enum
CREATE TYPE public.invoice_status AS ENUM ('open', 'paid', 'overdue', 'cancelled');

-- Invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_number serial,
  title text NOT NULL DEFAULT '',
  period_start date,
  period_end date,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL DEFAULT (CURRENT_DATE + interval '30 days'),
  status public.invoice_status NOT NULL DEFAULT 'open',
  discount numeric(12,2) NOT NULL DEFAULT 0,
  surcharge numeric(12,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Invoice items table
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'outro',
  service_date date NOT NULL DEFAULT CURRENT_DATE,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total_price numeric(12,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Invoice attachments (NF PDFs)
CREATE TABLE public.invoice_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  file_name text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can do everything
CREATE POLICY "Admins manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team view assigned invoices" ON public.invoices FOR SELECT TO authenticated
  USING (client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE POLICY "Admins manage invoice_items" ON public.invoice_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team view assigned invoice_items" ON public.invoice_items FOR SELECT TO authenticated
  USING (invoice_id IN (SELECT id FROM public.invoices WHERE client_id IN (SELECT get_user_client_ids(auth.uid()))));

CREATE POLICY "Admins manage invoice_attachments" ON public.invoice_attachments FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team view assigned invoice_attachments" ON public.invoice_attachments FOR SELECT TO authenticated
  USING (invoice_id IN (SELECT id FROM public.invoices WHERE client_id IN (SELECT get_user_client_ids(auth.uid()))));

-- Updated_at trigger
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
