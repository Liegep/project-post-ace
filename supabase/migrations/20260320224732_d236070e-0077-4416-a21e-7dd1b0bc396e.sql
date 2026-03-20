
-- Add visibility control to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS client_visible boolean NOT NULL DEFAULT true;

-- Add billing visibility control to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS show_invoices_to_client boolean NOT NULL DEFAULT true;
