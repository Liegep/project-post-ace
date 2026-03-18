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
  addPost: (post: Omit<Post, "id" | "comments" | "createdAt" | "clientLabel" | "position" | "archived" | "archivedAt" | "trelloCardId"> & { deadline?: Date; clientCreated?: boolean }) => Promise<boolean>;
  updatePostStatus: (id: string, status: PostStatus[]) => void;
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
  toggleColumnVisibility: (id: string, visible: boolean) => void;
  movePostToColumn: (postId: string, columnId: string | null) => void;
  reorderPostsInColumn: (columnId: string | null, orderedPostIds: string[]) => void;
  unarchivePost: (id: string, columnId?: string | null, clientInitiated?: boolean) => void;
  bulkUpdateStatus: (ids: string[], status: PostStatus[]) => void;
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
    deadline: row.deadline ? new Date(row.deadline) : null,
    status: (Array.isArray(row.status) ? row.status : [row.status]) as PostStatus[],
    clientLabel: row.client_label as ClientLabel,
    comments,
    tags: row.tags || [],
    createdAt: new Date(row.created_at),
    columnId: row.column_id || null,
    position: row.position ?? 0,
    archived: row.archived ?? false,
    archivedAt: row.archived_at ? new Date(row.archived_at) : null,
    trelloCardId: row.trello_card_id || null,
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
      const { DEFAULT_TAGS } = await import("@/types/post");
      const defaultTagIds = DEFAULT_TAGS.map((tag) => tag.id);

      const [postsRes, commentsRes, tagsRes, columnsRes] = await Promise.all([
        supabase.from("posts").select("*").eq("client_id", clientId).order("position", { ascending: true }).order("created_at", { ascending: false }),
        supabase.from("comments").select("*").order("created_at", { ascending: true }),
        supabase.from("tags").select("*").or(`client_id.eq.${clientId},id.in.(${defaultTagIds.join(",")})`),
        supabase.from("columns").select("*").eq("client_id", clientId).order("position", { ascending: true }),
      ]);

      const commentsMap: Record<string, Comment[]> = {};
      (commentsRes.data || []).forEach((c: any) => {
        const comment: Comment = { id: c.id, postId: c.post_id, author: c.author, text: c.text, createdAt: new Date(c.created_at) };
        if (!commentsMap[c.post_id]) commentsMap[c.post_id] = [];
        commentsMap[c.post_id].push(comment);
      });

      setPosts((postsRes.data || []).map((p: any) => dbPostToPost(p, commentsMap[p.id] || [])));
      
      const dbTags = tagsRes.data || [];
      const dbTagIds = new Set(dbTags.map((tag: any) => tag.id));
      const missingDefaultTags = DEFAULT_TAGS.filter((tag) => !dbTagIds.has(tag.id));

      if (missingDefaultTags.length > 0) {
        const tagsToInsert = missingDefaultTags.map((tag) => ({ ...tag, client_id: null }));
        await supabase.from("tags").insert(tagsToInsert as any);
      }

      setTags([...dbTags.map((t: any) => ({ id: t.id, name: t.name, color: t.color })), ...missingDefaultTags]);
      
      setColumns((columnsRes.data || []).map((c: any) => ({ id: c.id, clientId: c.client_id, name: c.name, position: c.position, visibleToClient: c.visible_to_client ?? false })));
      setLoading(false);
    };
    fetchAll();
  }, [clientId]);

  const setPostingPeriod = useCallback(async (period: string) => {
    setPostingPeriodState(period);
    await supabase.from("clients").update({ posting_period: period } as any).eq("id", clientId);
  }, [clientId]);

  const addPost = useCallback(async (post: Omit<Post, "id" | "comments" | "createdAt" | "clientLabel" | "position" | "archived" | "archivedAt" | "trelloCardId"> & { deadline?: Date; clientCreated?: boolean }) => {
    let resolvedColumnId = post.columnId || null;

    // When client creates a post, always assign to "entrada" column
    if (post.clientCreated && clientId) {
      // Try to find existing "entrada" column
      const { data: existingCols } = await supabase
        .from("columns")
        .select("id, name")
        .eq("client_id", clientId);

      const entradaCol = (existingCols || []).find((c: any) => c.name.toLowerCase() === "entrada");
      if (entradaCol) {
        resolvedColumnId = entradaCol.id;
      } else {
        // Create "entrada" column
        const { data: newCol } = await supabase
          .from("columns")
          .insert({ client_id: clientId, name: "Entrada", position: 0 } as any)
          .select()
          .single();
        if (newCol) {
          resolvedColumnId = (newCol as any).id;
        }
      }
    }

    const insertData: Record<string, any> = {
      title: post.title,
      image_url: post.imageUrl || '',
      media_type: post.mediaType || 'image',
      media_urls: post.mediaUrls || [],
      caption: post.caption || '',
      status: post.clientCreated ? ['em_desenvolvimento'] : (Array.isArray(post.status) ? post.status : [post.status]),
      tags: post.tags || [],
      client_id: clientId,
      column_id: resolvedColumnId,
    };
    if (post.deadline) {
      insertData.deadline = post.deadline.toISOString();
    }
    if (post.clientCreated) {
      insertData.client_created_at = new Date().toISOString();
    }
    const { data, error } = await supabase.from("posts").insert(insertData as any).select().single();
    if (data && !error) {
      setPosts((prev) => [dbPostToPost(data, []), ...prev]);
    }
    return !error;
  }, [clientId]);

  const updatePostStatus = useCallback(async (id: string, status: PostStatus[]) => {
    const updates: Record<string, any> = { status };
    const post = posts.find(p => p.id === id);
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    await supabase.from("posts").update(updates).eq("id", id);
    pushToTrello(id, "update");

    // Notify admins when status includes "pronto" or "finalizado"
    if (status.some(s => ["pronto", "finalizado"].includes(s))) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .maybeSingle();
        const userName = (profile as any)?.full_name || session.user.email || "Usuário";

        // Get client name
        let clientName = "";
        if (clientId) {
          const { data: clientData } = await supabase
            .from("clients")
            .select("name")
            .eq("id", clientId)
            .maybeSingle();
          clientName = (clientData as any)?.name || "";
        }

        await supabase.from("admin_notifications").insert({
          type: "status_change",
          title: `${userName}${clientName ? " - " + clientName : ""}`,
          message: `Post "${post?.title || ""}" marcado como "${status.join(', ')}" por ${userName}`,
          client_id: clientId || null,
          post_id: id,
          user_id: null,
        } as any);
      }
    }
  }, [posts, clientId]);

  const updateClientLabel = useCallback(async (id: string, label: ClientLabel) => {
    let newColumnId: string | undefined;

    // When client approves, move post to "Aprovados" column
    if (label === "aprovado" && clientId) {
      const { data: existingCols } = await supabase
        .from("columns")
        .select("id, name")
        .eq("client_id", clientId);

      const aprovadosCol = (existingCols || []).find((c: any) => c.name.toLowerCase() === "aprovados");
      if (aprovadosCol) {
        newColumnId = aprovadosCol.id;
      } else {
        // Create "Aprovados" column at the end
        const maxPos = (existingCols || []).length;
        const { data: newCol } = await supabase
          .from("columns")
          .insert({ client_id: clientId, name: "Aprovados", position: maxPos } as any)
          .select()
          .single();
        if (newCol) {
          newColumnId = (newCol as any).id;
          setColumns((prev) => [...prev, { id: (newCol as any).id, clientId, name: "Aprovados", position: maxPos, visibleToClient: false }]);
        }
      }
    }

    const dbUpdates: Record<string, any> = { client_label: label };
    if (newColumnId) dbUpdates.column_id = newColumnId;

    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, clientLabel: label, ...(newColumnId ? { columnId: newColumnId } : {}) } : p)));
    await supabase.from("posts").update(dbUpdates).eq("id", id);
  }, [clientId]);

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
    // Auto-archive/unarchive based on "publicado" tag
    if (updates.tags !== undefined) {
      const currentPost = posts.find((p) => p.id === id);
      const hadPublicado = currentPost?.tags.includes("publicado") ?? false;
      const hasPublicado = updates.tags.includes("publicado");
      if (!hadPublicado && hasPublicado) {
        updates.archived = true;
        updates.archivedAt = new Date();
      } else if (hadPublicado && !hasPublicado) {
        updates.archived = false;
        updates.archivedAt = null;
      }
    }

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
    if (updates.archived !== undefined) dbUpdates.archived = updates.archived;
    if (updates.archivedAt !== undefined) dbUpdates.archived_at = updates.archivedAt instanceof Date ? updates.archivedAt.toISOString() : updates.archivedAt;
    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from("posts").update(dbUpdates).eq("id", id);
      pushToTrello(id, "update");
    }
  }, [posts]);

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
    const col: Column = { id: data.id, clientId: data.client_id, name: data.name, position: data.position, visibleToClient: data.visible_to_client ?? false };
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

  const toggleColumnVisibility = useCallback(async (id: string, visible: boolean) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, visibleToClient: visible } : c)));
    await supabase.from("columns").update({ visible_to_client: visible } as any).eq("id", id);
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
    const updates: Record<string, any> = { status };
    setPosts((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, status } : p));
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
      clientId, posts: activePosts, archivedPosts, tags, columns, postingPeriod, companyLogo, setPostingPeriod, setCompanyLogo,
      addPost, updatePostStatus, updateClientLabel, addComment, deletePost, updatePost,
      addTag, deleteTag, uploadMedia, addColumn, renameColumn, deleteColumn, reorderColumns, toggleColumnVisibility,
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
