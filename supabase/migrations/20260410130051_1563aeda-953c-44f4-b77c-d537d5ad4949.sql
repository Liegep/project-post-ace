
-- Add trigger_type and trigger_value to support tag-based triggers
ALTER TABLE public.kanban_automations
  ADD COLUMN trigger_type text NOT NULL DEFAULT 'column_move',
  ADD COLUMN trigger_value text NOT NULL DEFAULT '';

-- Make trigger_column_id nullable (not needed for tag triggers)
ALTER TABLE public.kanban_automations
  ALTER COLUMN trigger_column_id DROP NOT NULL;
