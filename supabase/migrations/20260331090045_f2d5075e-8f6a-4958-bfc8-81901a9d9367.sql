
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS proposal_type text NOT NULL DEFAULT 'project',
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pieces_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS accepted_ip text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS accepted_email text NOT NULL DEFAULT '';
