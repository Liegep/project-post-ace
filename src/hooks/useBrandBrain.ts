import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type VocabularyStatus = "approved" | "avoid" | "forbidden";

export interface BrandBrain {
  id: string;
  client_id: string;
  mission: string;
  vision: string;
  summary: string;
}
export interface VocabularyItem {
  id: string;
  client_id: string;
  term: string;
  category: string;
  emotion: string;
  status: VocabularyStatus;
  notes: string;
  brand: string;
  content_type: string;
  priority: string;
  frequency: string;
  related_words: string[];
  approved_phrases: string[];
  can_be_used: boolean;
  technical_notes: string;
}
export interface ContentPillar {
  id: string;
  client_id: string;
  name: string;
  objective: string;
  themes: string[];
  main_emotion: string;
  suggested_frequency: string;
  notes: string;
}
export interface BrandVoice {
  id: string;
  client_id: string;
  brand_name: string;
  emotional_tone: string;
  archetype: string;
  writing_rhythm: string;
  formality_level: string;
  things_to_avoid: string;
  good_examples: string[];
  bad_examples: string[];
}
export interface AvoidWord {
  id: string;
  client_id: string;
  word: string;
  reason: string;
  recommended_alternative: string;
  category: string;
}
export interface ApprovedExpression {
  id: string;
  client_id: string;
  expression: string;
  usage_context: string;
  emotion: string;
  notes: string;
}
export interface VisualDirection {
  id: string;
  client_id: string;
  brand_name: string;
  category: string;
  direction: string;
  colors: string[];
  image_style: string;
  lighting: string;
  composition: string;
  typography: string;
  things_to_avoid: string;
}


export function useBrandBrain(clientId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [brain, setBrain] = useState<BrandBrain | null>(null);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [voices, setVoices] = useState<BrandVoice[]>([]);
  const [avoid, setAvoid] = useState<AvoidWord[]>([]);
  const [expressions, setExpressions] = useState<ApprovedExpression[]>([]);
  const [visuals, setVisuals] = useState<VisualDirection[]>([]);

  const refresh = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const [b, vo, p, vc, a, e, vd] = await Promise.all([
      supabase.from("brand_brains").select("*").eq("client_id", clientId).maybeSingle(),
      supabase.from("brand_vocabulary").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("content_pillars").select("*").eq("client_id", clientId).order("created_at", { ascending: true }),
      supabase.from("brand_voice").select("*").eq("client_id", clientId).order("created_at", { ascending: true }),
      supabase.from("words_to_avoid").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("approved_expressions").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("visual_directions").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    ]);
    setBrain((b.data as any) || null);
    setVocabulary((vo.data as any) || []);
    setPillars((p.data as any) || []);
    setVoices((vc.data as any) || []);
    setAvoid((a.data as any) || []);
    setExpressions((e.data as any) || []);
    setVisuals((vd.data as any) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { loading, brain, vocabulary, pillars, voices, voice: voices[0] || null, avoid, expressions, visuals, refresh };
}
