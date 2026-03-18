ALTER TABLE public.appointments ADD COLUMN cancelled boolean NOT NULL DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN cancelled_at timestamp with time zone DEFAULT NULL;