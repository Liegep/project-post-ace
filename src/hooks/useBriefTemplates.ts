import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'yes_no'
  | 'multiple_choice'
  | 'checkbox'
  | 'file_upload'
  | 'link'
  | 'dropdown'
  | 'scale'
  | 'date'
  | 'time'
  | 'number'
  | 'email'
  | 'grid'
  | 'section';

export interface BriefQuestion {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  helpText?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  gridRows?: string[];
  gridCols?: string[];
  allowOther?: boolean;
}

export interface BriefTemplateRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: string;
  locale: string;
  questions: BriefQuestion[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BriefAssignmentRow {
  id: string;
  template_id: string;
  client_id: string;
  assigned_by: string;
  title: string;
  status: 'pending' | 'submitted' | 'reopened';
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface BriefResponseRow {
  id: string;
  assignment_id: string;
  client_id: string;
  template_id: string;
  answers: Record<string, any>;
  submitted_by: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useBriefTemplates() {
  const [templates, setTemplates] = useState<BriefTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("brief_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setTemplates(data.map((t: any) => ({
        ...t,
        questions: Array.isArray(t.questions) ? t.questions : [],
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createTemplate = async (template: Partial<BriefTemplateRow>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from("brief_templates").insert({
      user_id: user.id,
      name: template.name || "Novo template",
      description: template.description || "",
      category: template.category || "general",
      locale: template.locale || "pt",
      questions: (template.questions || []) as any,
      active: template.active ?? true,
    }).select().single();
    if (error) {
      toast({ title: "Erro ao criar template", description: error.message, variant: "destructive" });
      return null;
    }
    await load();
    return data;
  };

  const updateTemplate = async (id: string, updates: Partial<BriefTemplateRow>) => {
    const payload: any = { ...updates };
    if (payload.questions) payload.questions = payload.questions as any;
    const { error } = await supabase.from("brief_templates").update(payload).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return false;
    }
    await load();
    return true;
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("brief_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return false;
    }
    await load();
    return true;
  };

  return { templates, loading, reload: load, createTemplate, updateTemplate, deleteTemplate };
}

export function useBriefAssignments(filter?: { clientId?: string; templateId?: string }) {
  const [assignments, setAssignments] = useState<BriefAssignmentRow[]>([]);
  const [responses, setResponses] = useState<BriefResponseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("brief_assignments").select("*").order("created_at", { ascending: false });
    if (filter?.clientId) q = q.eq("client_id", filter.clientId);
    if (filter?.templateId) q = q.eq("template_id", filter.templateId);
    const { data: aData } = await q;

    let rQ = supabase.from("brief_responses").select("*");
    if (filter?.clientId) rQ = rQ.eq("client_id", filter.clientId);
    const { data: rData } = await rQ;

    setAssignments((aData as any[]) || []);
    setResponses(((rData as any[]) || []).map(r => ({
      ...r,
      answers: typeof r.answers === "object" && r.answers ? r.answers : {},
    })));
    setLoading(false);
  }, [filter?.clientId, filter?.templateId]);

  useEffect(() => { load(); }, [load]);

  const createAssignment = async (templateId: string, clientId: string, title: string, dueDate?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from("brief_assignments").insert({
      template_id: templateId,
      client_id: clientId,
      assigned_by: user.id,
      title,
      due_date: dueDate || null,
      status: "pending",
    }).select().single();
    if (error) {
      toast({ title: "Erro ao enviar brief", description: error.message, variant: "destructive" });
      return null;
    }
    await load();
    return data;
  };

  const upsertResponse = async (
    assignmentId: string,
    clientId: string,
    templateId: string,
    answers: Record<string, any>,
    submit: boolean
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    const existing = responses.find(r => r.assignment_id === assignmentId);

    if (existing) {
      const { error } = await supabase.from("brief_responses").update({
        answers: answers as any,
        submitted_by: submit ? user?.id : existing.submitted_by,
        submitted_at: submit ? new Date().toISOString() : existing.submitted_at,
      }).eq("id", existing.id);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        return false;
      }
    } else {
      const { error } = await supabase.from("brief_responses").insert({
        assignment_id: assignmentId,
        client_id: clientId,
        template_id: templateId,
        answers: answers as any,
        submitted_by: submit ? user?.id : null,
        submitted_at: submit ? new Date().toISOString() : null,
      });
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        return false;
      }
    }

    if (submit) {
      await supabase.from("brief_assignments").update({ status: "submitted" }).eq("id", assignmentId);
    }
    await load();
    return true;
  };

  const reopenAssignment = async (assignmentId: string) => {
    const { error } = await supabase.from("brief_assignments").update({ status: "reopened" }).eq("id", assignmentId);
    if (error) {
      toast({ title: "Erro ao reabrir", description: error.message, variant: "destructive" });
      return false;
    }
    await load();
    return true;
  };

  const deleteAssignment = async (assignmentId: string) => {
    const { error } = await supabase.from("brief_assignments").delete().eq("id", assignmentId);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return false;
    }
    await load();
    return true;
  };

  return { assignments, responses, loading, reload: load, createAssignment, upsertResponse, reopenAssignment, deleteAssignment };
}
