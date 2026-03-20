
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT '';
