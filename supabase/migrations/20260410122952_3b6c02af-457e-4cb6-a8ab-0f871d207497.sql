
CREATE TABLE public.kanban_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  trigger_column_id UUID NOT NULL REFERENCES public.columns(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('add_tag', 'change_color', 'mark_done')),
  action_value TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kanban_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all automations"
  ON public.kanban_automations FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Admins manage automations"
  ON public.kanban_automations FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team view assigned automations"
  ON public.kanban_automations FOR SELECT
  TO authenticated
  USING (client_id IN (SELECT get_user_client_ids(auth.uid())));

CREATE TRIGGER update_kanban_automations_updated_at
  BEFORE UPDATE ON public.kanban_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
