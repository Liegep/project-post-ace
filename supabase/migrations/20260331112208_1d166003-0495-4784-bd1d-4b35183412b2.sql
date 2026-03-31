
-- Contracts table for SuperAdmin to create contract templates linked to clients
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contract acceptances log
CREATE TABLE public.contract_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT NOT NULL DEFAULT ''
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_acceptances ENABLE ROW LEVEL SECURITY;

-- Contracts: only super_admin can manage
CREATE POLICY "Super admins manage contracts" ON public.contracts
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Contracts: clients can view their pending contracts
CREATE POLICY "Clients view own pending contracts" ON public.contracts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'client'::app_role) 
    AND client_id IN (SELECT get_user_client_ids(auth.uid()))
  );

-- Contract acceptances: authenticated users can insert their own
CREATE POLICY "Users insert own acceptances" ON public.contract_acceptances
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Contract acceptances: super_admin can view all
CREATE POLICY "Super admins view all acceptances" ON public.contract_acceptances
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Contract acceptances: users can view their own
CREATE POLICY "Users view own acceptances" ON public.contract_acceptances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
