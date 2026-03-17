import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Post, PostStatus, ClientLabel, Comment, Tag, MediaType, Column } from "@/types/post";
import { supabase } from "@/integrations/supabase/client";
import { pushToTrello } from "@/lib/trelloPush";

interface PostsContextType {
  clientId: string;
  posts: Post[];
  archivedPosts: Post[];
  tags: Tag[];
  columns: Column[];
  postingPeriod: string;
  companyLogo: string;
  setPostingPeriod: (period: string) => void;
  setCompanyLogo: (url: string) => void;
  addPost: (post: Omit<Post, "id" | "comments" | "createdAt" | "clientLabel" | "position" | "archived" | "archivedAt"> & { deadline?: Date }) => void;
  updatePostStatus: (id: string, status: PostStatus) => void;
  updateClientLabel: (id: string, label: ClientLabel) => void;
  addComment: (postId: string, author: string, text: string) => void;
  deletePost: (id: string) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  addTag: (name: string, color: string) => Tag;
  deleteTag: (id: string) => void;
  uploadMedia: (file: File) => Promise<string>;
  addColumn: (name: string) => Promise<Column>;
  renameColumn: (id: string, name: string) => void;
  deleteColumn: (id: string) => void;
  reorderColumns: (columns: Column[]) => void;
  movePostToColumn: (postId: string, columnId: string | null) => void;
  reorderPostsInColumn: (columnId: string | null, orderedPostIds: string[]) => void;
  unarchivePost: (id: string, columnId?: string | null, clientInitiated?: boolean) => void;
  bulkUpdateStatus: (ids: string[], status: PostStatus) => void;
  bulkDeletePosts: (ids: string[]) => void;
  bulkMoveToColumn: (ids: string[], columnId: string | null) => void;
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
    columnId: row.column_id || null,
    position: row.position ?? 0,
    archived: row.archived ?? false,
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
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
  const [columns, setColumns] = useState<Column[]>([]);
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
      const [postsRes, commentsRes, tagsRes, columnsRes] = await Promise.all([
        supabase.from("posts").select("*").eq("client_id", clientId).order("position", { ascending: true }).order("created_at", { ascending: false }),
        supabase.from("comments").select("*").order("created_at", { ascending: true }),
        supabase.from("tags").select("*").eq("client_id", clientId),
        supabase.from("columns").select("*").eq("client_id", clientId).order("position", { ascending: true }),
      ]);

      const commentsMap: Record<string, Comment[]> = {};
      (commentsRes.data || []).forEach((c: any) => {
        const comment: Comment = { id: c.id, postId: c.post_id, author: c.author, text: c.text, createdAt: new Date(c.created_at) };
        if (!commentsMap[c.post_id]) commentsMap[c.post_id] = [];
        commentsMap[c.post_id].push(comment);
      });

      setPosts((postsRes.data || []).map((p: any) => dbPostToPost(p, commentsMap[p.id] || [])));
      setTags((tagsRes.data || []).map((t: any) => ({ id: t.id, name: t.name, color: t.color })));
      setColumns((columnsRes.data || []).map((c: any) => ({ id: c.id, clientId: c.client_id, name: c.name, position: c.position })));
      setLoading(false);
    };
    fetchAll();
  }, [clientId]);

  const setPostingPeriod = useCallback(async (period: string) => {
    setPostingPeriodState(period);
    await supabase.from("clients").update({ posting_period: period } as any).eq("id", clientId);
  }, [clientId]);

  const addPost = useCallback(async (post: Omit<Post, "id" | "comments" | "createdAt" | "clientLabel" | "position" | "archived" | "archivedAt"> & { deadline?: Date }) => {
    const insertData: Record<string, any> = {
      title: post.title,
      image_url: post.imageUrl || '',
      media_type: post.mediaType || 'image',
      media_urls: post.mediaUrls || [],
      caption: post.caption || '',
      status: post.status,
      tags: post.tags || [],
      client_id: clientId,
      column_id: post.columnId || null,
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
    const isArchiving = status === "finalizado";
    const updates: Record<string, any> = { status };
    if (isArchiving) {
      updates.archived = true;
      updates.archived_at = new Date().toISOString();
    }
    setPosts((prev) => prev.map((p) => (p.id === id ? { 
      ...p, 
      status, 
      archived: isArchiving ? true : p.archived,
      archivedAt: isArchiving ? new Date() : p.archivedAt,
    } : p)));
    await supabase.from("posts").update(updates).eq("id", id);
    pushToTrello(id, "update");
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
    if (updates.columnId !== undefined) dbUpdates.column_id = updates.columnId;
    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from("posts").update(dbUpdates).eq("id", id);
      pushToTrello(id, "update");
    }
  }, []);

  const movePostToColumn = useCallback(async (postId: string, columnId: string | null) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, columnId } : p)));
    await supabase.from("posts").update({ column_id: columnId } as any).eq("id", postId);
    pushToTrello(postId, "move_column");
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

  const addColumn = useCallback(async (name: string): Promise<Column> => {
    const position = columns.length;
    const { data, error } = await supabase.from("columns").insert({
      client_id: clientId,
      name,
      position,
    } as any).select().single();
    if (error) throw error;
    const col: Column = { id: data.id, clientId: data.client_id, name: data.name, position: data.position };
    setColumns((prev) => [...prev, col]);
    return col;
  }, [clientId, columns.length]);

  const renameColumn = useCallback(async (id: string, name: string) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
    await supabase.from("columns").update({ name } as any).eq("id", id);
  }, []);

  const deleteColumn = useCallback(async (id: string) => {
    // Move posts from this column to unassigned
    setPosts((prev) => prev.map((p) => (p.id && p.columnId === id ? { ...p, columnId: null } : p)));
    await supabase.from("posts").update({ column_id: null } as any).eq("column_id", id);
    setColumns((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("columns").delete().eq("id", id);
  }, []);

  const reorderColumns = useCallback(async (newColumns: Column[]) => {
    setColumns(newColumns);
    for (let i = 0; i < newColumns.length; i++) {
      await supabase.from("columns").update({ position: i } as any).eq("id", newColumns[i].id);
    }
  }, []);

  const reorderPostsInColumn = useCallback(async (columnId: string | null, orderedPostIds: string[]) => {
    setPosts((prev) => {
      const updated = [...prev];
      orderedPostIds.forEach((id, index) => {
        const postIndex = updated.findIndex((p) => p.id === id);
        if (postIndex !== -1) {
          updated[postIndex] = { ...updated[postIndex], position: index, columnId };
        }
      });
      return updated;
    });
    for (let i = 0; i < orderedPostIds.length; i++) {
      await supabase.from("posts").update({ position: i, column_id: columnId } as any).eq("id", orderedPostIds[i]);
    }
  }, []);

  const setCompanyLogo = useCallback(async (url: string) => {
    setCompanyLogoState(url);
    await supabase.from("clients").update({ logo_url: url } as any).eq("id", clientId);
  }, [clientId]);

  const unarchivePost = useCallback(async (id: string, columnId?: string | null, clientInitiated?: boolean) => {
    const updates: Partial<Post> = { archived: false, archivedAt: null, status: "pronto" as PostStatus };
    if (columnId !== undefined) updates.columnId = columnId;
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    const dbUpdates: Record<string, any> = { archived: false, archived_at: null, status: "pronto" };
    if (columnId !== undefined) dbUpdates.column_id = columnId;
    if (clientInitiated) dbUpdates.client_unarchived_at = new Date().toISOString();
    await supabase.from("posts").update(dbUpdates as any).eq("id", id);
  }, []);

  const bulkUpdateStatus = useCallback(async (ids: string[], status: PostStatus) => {
    const isArchiving = status === "finalizado";
    const updates: Record<string, any> = { status };
    if (isArchiving) {
      updates.archived = true;
      updates.archived_at = new Date().toISOString();
    }
    setPosts((prev) => prev.map((p) => ids.includes(p.id) ? {
      ...p, status,
      archived: isArchiving ? true : p.archived,
      archivedAt: isArchiving ? new Date() : p.archivedAt,
    } : p));
    await supabase.from("posts").update(updates).in("id", ids);
  }, []);

  const bulkDeletePosts = useCallback(async (ids: string[]) => {
    setPosts((prev) => prev.filter((p) => !ids.includes(p.id)));
    await supabase.from("posts").delete().in("id", ids);
  }, []);

  const bulkMoveToColumn = useCallback(async (ids: string[], columnId: string | null) => {
    setPosts((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, columnId } : p));
    await supabase.from("posts").update({ column_id: columnId } as any).in("id", ids);
  }, []);

  const activePosts = posts.filter((p) => !p.archived);
  const archivedPosts = posts.filter((p) => p.archived);

  return (
    <PostsContext.Provider value={{
      posts: activePosts, archivedPosts, tags, columns, postingPeriod, companyLogo, setPostingPeriod, setCompanyLogo,
      addPost, updatePostStatus, updateClientLabel, addComment, deletePost, updatePost,
      addTag, deleteTag, uploadMedia, addColumn, renameColumn, deleteColumn, reorderColumns,
      movePostToColumn, reorderPostsInColumn, unarchivePost, bulkUpdateStatus, bulkDeletePosts, bulkMoveToColumn, loading,
    }}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePosts = () => {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error("usePosts must be used within PostsProvider");
  return ctx;
};
