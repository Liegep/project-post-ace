
-- Add owner_id and shared to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false;

-- Update has_role to make super_admin inherit admin and team_member permissions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (role = 'super_admin' AND _role IN ('admin', 'team_member'))
      )
  )
$$;

-- Create is_super_admin helper
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;
