import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TextContentType = "blog" | "artigo" | "texto" | "copy" | "documento";
export type TextContentStatus = "draft" | "internal" | "pending_approval" | "approved" | "rejected" | "published";

export interface TextContent {
  id: string;
  client_id: string;
  content_type: TextContentType;
  title: string;
  subtitle: string;
  body: string;
  status: TextContentStatus;
  planned_date: string | null;
  observations: string;
  client_label: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TextContentComment {
  id: string;
  text_content_id: string;
  user_id: string;
  author_name: string;
  author_role: string;
  message: string;
  created_at: string;
}

export const CONTENT_TYPE_LABELS: Record<TextContentType, string> = {
  blog: "Blog",
  artigo: "Artigo",
  texto: "Texto",
  copy: "Copy",
  documento: "Documento",
};

export const TEXT_STATUS_LABELS: Record<TextContentStatus, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  internal: { label: "Interno", color: "bg-secondary text-secondary-foreground" },
  pending_approval: { label: "Aguardando Aprovação", color: "bg-warning/15 text-warning" },
  approved: { label: "Aprovado", color: "bg-success/15 text-success" },
  rejected: { label: "Reprovado", color: "bg-destructive/15 text-destructive" },
  published: { label: "Publicado", color: "bg-primary/15 text-primary" },
};

export function useTextContents(clientId: string) {
  const [contents, setContents] = useState<TextContent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("text_contents")
      .select("*")
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false });
    if (data) setContents(data as unknown as TextContent[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const create = async (content: Partial<TextContent>) => {
    const { data, error } = await supabase
      .from("text_contents")
      .insert({ ...content, client_id: clientId } as any)
      .select()
      .single();
    if (!error && data) {
      setContents((prev) => [data as unknown as TextContent, ...prev]);
      return data as unknown as TextContent;
    }
    return null;
  };

  const update = async (id: string, updates: Partial<TextContent>) => {
    const { error } = await supabase
      .from("text_contents")
      .update(updates as any)
      .eq("id", id);
    if (!error) {
      setContents((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c)));
    }
    return !error;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("text_contents").delete().eq("id", id);
    if (!error) setContents((prev) => prev.filter((c) => c.id !== id));
    return !error;
  };

  return { contents, loading, create, update, remove, reload: load };
}
