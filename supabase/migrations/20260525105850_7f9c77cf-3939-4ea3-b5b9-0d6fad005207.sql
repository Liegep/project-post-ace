
-- Brand Brain module: master record per client + section tables
-- All scoped by client_id with RLS mirroring the existing client_notes / hashtag_groups patterns

-- 1) Master record (1 per client)
CREATE TABLE public.brand_brains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  mission text NOT NULL DEFAULT '',
  vision text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Vocabulary
CREATE TABLE public.brand_vocabulary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  term text NOT NULL,
  category text NOT NULL DEFAULT 'keyword',
  emotion text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'approved',
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Content Pillars
CREATE TABLE public.content_pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  name text NOT NULL,
  objective text NOT NULL DEFAULT '',
  themes text[] NOT NULL DEFAULT '{}',
  main_emotion text NOT NULL DEFAULT '',
  suggested_frequency text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Brand Voice (1 per client)
CREATE TABLE public.brand_voice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  emotional_tone text NOT NULL DEFAULT '',
  archetype text NOT NULL DEFAULT '',
  writing_rhythm text NOT NULL DEFAULT '',
  formality_level text NOT NULL DEFAULT '',
  things_to_avoid text NOT NULL DEFAULT '',
  good_examples text[] NOT NULL DEFAULT '{}',
  bad_examples text[] NOT NULL DEFAULT '{}',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Words to avoid
CREATE TABLE public.words_to_avoid (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  word text NOT NULL,
  reason text NOT NULL DEFAULT '',
  recommended_alternative text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6) Approved expressions
CREATE TABLE public.approved_expressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  expression text NOT NULL,
  usage_context text NOT NULL DEFAULT '',
  emotion text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7) Visual directions
CREATE TABLE public.visual_directions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  category text NOT NULL,
  direction text NOT NULL DEFAULT '',
  colors text[] NOT NULL DEFAULT '{}',
  image_style text NOT NULL DEFAULT '',
  lighting text NOT NULL DEFAULT '',
  composition text NOT NULL DEFAULT '',
  things_to_avoid text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8) AI prompt templates (reusable)
CREATE TABLE public.ai_prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  name text NOT NULL,
  template_text text NOT NULL DEFAULT '',
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9) Generated prompts (history)
CREATE TABLE public.generated_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  pillar_id uuid,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  output text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_brand_vocabulary_client ON public.brand_vocabulary(client_id);
CREATE INDEX idx_content_pillars_client ON public.content_pillars(client_id);
CREATE INDEX idx_words_to_avoid_client ON public.words_to_avoid(client_id);
CREATE INDEX idx_approved_expressions_client ON public.approved_expressions(client_id);
CREATE INDEX idx_visual_directions_client ON public.visual_directions(client_id);
CREATE INDEX idx_ai_prompt_templates_client ON public.ai_prompt_templates(client_id);
CREATE INDEX idx_generated_prompts_client ON public.generated_prompts(client_id);

-- Triggers (updated_at)
CREATE TRIGGER trg_brand_brains_updated BEFORE UPDATE ON public.brand_brains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_brand_vocabulary_updated BEFORE UPDATE ON public.brand_vocabulary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_content_pillars_updated BEFORE UPDATE ON public.content_pillars
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_brand_voice_updated BEFORE UPDATE ON public.brand_voice
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_words_to_avoid_updated BEFORE UPDATE ON public.words_to_avoid
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_approved_expressions_updated BEFORE UPDATE ON public.approved_expressions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_visual_directions_updated BEFORE UPDATE ON public.visual_directions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ai_prompt_templates_updated BEFORE UPDATE ON public.ai_prompt_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.brand_brains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_voice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words_to_avoid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_expressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_directions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_prompts ENABLE ROW LEVEL SECURITY;

-- Helper macro applied per-table: super admins manage; team manages assigned clients; clients view assigned
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['brand_brains','brand_vocabulary','content_pillars','brand_voice','words_to_avoid','approved_expressions','visual_directions','ai_prompt_templates','generated_prompts'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format($f$
      CREATE POLICY "Super admins manage %1$I" ON public.%1$I
        FOR ALL TO authenticated
        USING (public.is_super_admin(auth.uid()))
        WITH CHECK (public.is_super_admin(auth.uid()));
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Team manage assigned %1$I" ON public.%1$I
        FOR ALL TO authenticated
        USING (client_id IN (SELECT public.get_user_client_ids(auth.uid())))
        WITH CHECK (client_id IN (SELECT public.get_user_client_ids(auth.uid())));
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Clients view assigned %1$I" ON public.%1$I
        FOR SELECT TO authenticated
        USING (public.has_role(auth.uid(), 'client'::app_role) AND client_id IN (SELECT public.get_user_client_ids(auth.uid())));
    $f$, t);
  END LOOP;
END $$;
