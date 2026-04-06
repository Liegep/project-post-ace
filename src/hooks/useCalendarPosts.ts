import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CalendarPostStatus = "draft" | "in_review" | "approved" | "scheduled" | "published";

export interface CalendarPost {
  id: string;
  title: string;
  caption: string;
  media_urls: string[];
  media_type: string;
  client_id: string;
  publish_date: string;
  publish_time: string;
  status: CalendarPostStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    logo_url: string;
  } | null;
}

export const STATUS_CONFIG: Record<CalendarPostStatus, { label: string; dotClass: string; bgClass: string; borderClass: string }> = {
  draft: { label: "Rascunho", dotClass: "bg-gray-400", bgClass: "bg-gray-50 dark:bg-gray-900/30", borderClass: "border-l-gray-400" },
  in_review: { label: "Em Revisão", dotClass: "bg-yellow-500", bgClass: "bg-yellow-50 dark:bg-yellow-900/20", borderClass: "border-l-yellow-500" },
  approved: { label: "Aprovado", dotClass: "bg-blue-500", bgClass: "bg-blue-50 dark:bg-blue-900/20", borderClass: "border-l-blue-500" },
  scheduled: { label: "Agendado", dotClass: "bg-purple-500", bgClass: "bg-purple-50 dark:bg-purple-900/20", borderClass: "border-l-purple-500" },
  published: { label: "Publicado", dotClass: "bg-green-500", bgClass: "bg-green-50 dark:bg-green-900/20", borderClass: "border-l-green-500" },
};

export function useCalendarPosts() {
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("calendar_posts")
      .select("*, clients(name, logo_url)")
      .order("publish_date", { ascending: true })
      .order("publish_time", { ascending: true }) as any;

    const fetched: CalendarPost[] = data || [];

    // Auto-mark past posts as "published" if they're scheduled/approved
    const now = new Date();
    const toPublish = fetched.filter((p) => {
      if (p.status !== "scheduled" && p.status !== "approved") return false;
      const [hours, minutes] = (p.publish_time || "12:00").split(":").map(Number);
      const postDate = new Date(p.publish_date + "T12:00:00");
      postDate.setHours(hours, minutes, 0, 0);
      return postDate <= now;
    });

    if (toPublish.length > 0) {
      const ids = toPublish.map((p) => p.id);
      await supabase
        .from("calendar_posts")
        .update({ status: "published" } as any)
        .in("id", ids);
      toPublish.forEach((p) => { p.status = "published"; });
    }

    setPosts(fetched);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const createPost = async (post: Partial<CalendarPost>) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("calendar_posts").insert({
      ...post,
      created_by: user?.id,
    } as any);
    if (!error) fetchPosts();
    return { error };
  };

  const updatePost = async (id: string, updates: Partial<CalendarPost>) => {
    const { error } = await supabase.from("calendar_posts").update(updates as any).eq("id", id);
    if (!error) fetchPosts();
    return { error };
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("calendar_posts").delete().eq("id", id);
    if (!error) fetchPosts();
    return { error };
  };

  return { posts, loading, fetchPosts, createPost, updatePost, deletePost };
}
