ALTER TABLE public.admin_invitations 
ADD COLUMN role public.app_role NOT NULL DEFAULT 'admin',
ADD COLUMN client_ids uuid[] NOT NULL DEFAULT '{}';