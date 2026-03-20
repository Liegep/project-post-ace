
-- Add billing configuration columns to clients table
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS billing_type text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS billing_recurrence_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_monthly_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_due_day integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS billing_start_date date NULL;
