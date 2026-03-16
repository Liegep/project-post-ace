import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Post, PostStatus, ClientLabel, Comment, Tag, MediaType } from "@/types/post";
import { supabase } from "@/integrations/supabase/client";

interface PostsContextType {
  posts: Post[];
  tags: Tag[];
  postingPeriod: string;
  companyLogo: string;
  setPostingPeriod: (period: string) => void;
  setCompanyLogo: (url: string) => void;
  addPost: (post: Omit<Post, "id" | "comments" | "createdAt" | "clientLabel"> & { deadline?: Date }) => void;
  updatePostStatus: (id: string, status: PostStatus) => void;
  updateClientLabel: (id: string, label: ClientLabel) => void;
  addComment: (postId: string, author: string, text: string) => void;
  deletePost: (id: string) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  addTag: (name: string, color: string) => Tag;
  deleteTag: (id: string) => void;
  uploadMedia: (file: File) => Promise<string>;
  loading: boolean;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

function dbPostToPost(row: any, comments: Comment[]): Post {
  const mediaUrls: string[] = row.media_urls && row.media_urls.length > 0
    ? row.media_urls
    : row.image_url ? [row.image_url] : [];
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    mediaType: (row.media_type || "image") as MediaType,
    mediaUrls,
    caption: row.caption,
    deadline: row.deadline ? new Date(row.deadline) : new Date(),
    status: row.status as PostStatus,
    clientLabel: row.client_label as ClientLabel,
    comments,
    tags: row.tags || [],
    createdAt: new Date(row.created_at),
  };
}

interface PostsProviderProps {
  clientId: string;
  clientLogo?: string;
  clientPostingPeriod?: string;
  children: React.ReactNode;
}

export const PostsProvider: React.FC<PostsProviderProps> = ({ clientId, clientLogo = "", clientPostingPeriod = "", children }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [postingPeriod, setPostingPeriodState] = useState(clientPostingPeriod);
  const [companyLogo, setCompanyLogoState] = useState(clientLogo);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCompanyLogoState(clientLogo);
    setPostingPeriodState(clientPostingPeriod);
  }, [clientLogo, clientPostingPeriod]);

  useEffect(() => {
    if (!clientId) return;
    const fetchAll = async () => {
      setLoading(true);
      const [postsRes, commentsRes, tagsRes] = await Promise.all([
        supabase.from("posts").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
        supabase.from("comments").select("*").order("created_at", { ascending: true }),
        supabase.from("tags").select("*").eq("client_id", clientId),
      ]);

      const commentsMap: Record<string, Comment[]> = {};
      (commentsRes.data || []).forEach((c: any) => {
        const comment: Comment = { id: c.id, postId: c.post_id, author: c.author, text: c.text, createdAt: new Date(c.created_at) };
        if (!commentsMap[c.post_id]) commentsMap[c.post_id] = [];
        commentsMap[c.post_id].push(comment);
      });

      setPosts((postsRes.data || []).map((p: any) => dbPostToPost(p, commentsMap[p.id] || [])));
      setTags((tagsRes.data || []).map((t: any) => ({ id: t.id, name: t.name, color: t.color })));
      setLoading(false);
    };
    fetchAll();
  }, [clientId]);

  const setPostingPeriod = useCallback(async (period: string) => {
    setPostingPeriodState(period);
    await supabase.from("clients").update({ posting_period: period } as any).eq("id", clientId);
  }, [clientId]);

  const addPost = useCallback(async (post: Omit<Post, "id" | "comments" | "createdAt" | "clientLabel"> & { deadline?: Date }) => {
    const insertData: Record<string, any> = {
      title: post.title,
      image_url: post.imageUrl || '',
      media_type: post.mediaType || 'image',
      media_urls: post.mediaUrls || [],
      caption: post.caption || '',
      status: post.status,
      tags: post.tags || [],
      client_id: clientId,
    };
    if (post.deadline) {
      insertData.deadline = post.deadline.toISOString();
    }
    const { data, error } = await supabase.from("posts").insert(insertData as any).select().single();
    if (data && !error) {
      setPosts((prev) => [dbPostToPost(data, []), ...prev]);
    }
  }, [clientId]);

  const updatePostStatus = useCallback(async (id: string, status: PostStatus) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await supabase.from("posts").update({ status }).eq("id", id);
  }, []);

  const updateClientLabel = useCallback(async (id: string, label: ClientLabel) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, clientLabel: label } : p)));
    await supabase.from("posts").update({ client_label: label }).eq("id", id);
  }, []);

  const addComment = useCallback(async (postId: string, author: string, text: string) => {
    const { data, error } = await supabase.from("comments").insert({
      post_id: postId,
      author,
      text,
    }).select().single();
    if (data && !error) {
      const comment: Comment = { id: data.id, postId: data.post_id, author: data.author, text: data.text, createdAt: new Date(data.created_at) };
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, comment] } : p)));
    }
  }, []);

  const deletePost = useCallback(async (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("posts").delete().eq("id", id);
  }, []);

  const updatePost = useCallback(async (id: string, updates: Partial<Post>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.mediaType !== undefined) dbUpdates.media_type = updates.mediaType;
    if (updates.mediaUrls !== undefined) dbUpdates.media_urls = updates.mediaUrls;
    if (updates.caption !== undefined) dbUpdates.caption = updates.caption;
    if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline instanceof Date ? updates.deadline.toISOString() : updates.deadline;
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.clientLabel !== undefined) dbUpdates.client_label = updates.clientLabel;
    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from("posts").update(dbUpdates).eq("id", id);
    }
  }, []);

  const uploadMedia = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from("media").getPublicUrl(fileName);
    return data.publicUrl;
  }, []);

  const addTag = useCallback((name: string, color: string): Tag => {
    const tag: Tag = { id: crypto.randomUUID(), name, color };
    setTags((prev) => [...prev, tag]);
    supabase.from("tags").insert({ id: tag.id, name, color, client_id: clientId } as any);
    return tag;
  }, [clientId]);

  const deleteTag = useCallback((id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
    setPosts((prev) => prev.map((p) => ({ ...p, tags: p.tags.filter((t) => t !== id) })));
    supabase.from("tags").delete().eq("id", id);
  }, []);

  const setCompanyLogo = useCallback(async (url: string) => {
    setCompanyLogoState(url);
    await supabase.from("clients").update({ logo_url: url } as any).eq("id", clientId);
  }, [clientId]);

  return (
    <PostsContext.Provider value={{ posts, tags, postingPeriod, companyLogo, setPostingPeriod, setCompanyLogo, addPost, updatePostStatus, updateClientLabel, addComment, deletePost, updatePost, addTag, deleteTag, uploadMedia, loading }}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePosts = () => {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error("usePosts must be used within PostsProvider");
  return ctx;
};
