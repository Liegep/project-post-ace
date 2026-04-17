import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Post, PostStatus, ClientLabel, Comment, Tag, MediaType, Column } from "@/types/post";
import { supabase } from "@/integrations/supabase/client";
import { pushToTrello } from "@/lib/trelloPush";
import { logActivity } from "@/lib/activityLogger";
import { parsePostDeadline, serializePostDeadline } from "@/lib/postDeadline";
import { runAutomationsForPost, type AutomationResult } from "@/lib/automationEngine";

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
  deleteComment: (postId: string, commentId: string) => void;
  updateComment: (postId: string, commentId: string, text: string) => void;
  deletePost: (id: string) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
  addTag: (name: string, color: string) => Promise<Tag>;
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
    deadline: parsePostDeadline(row.deadline),
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

      const fetchedPosts = (postsRes.data || []).map((p: any) => dbPostToPost(p, commentsMap[p.id] || []));
      
      // Auto-archive posts past their deadline
      const now = new Date();
      const toArchive = fetchedPosts.filter((p: Post) => 
        p.deadline && new Date(p.deadline) < now && !p.archived
      );
      if (toArchive.length > 0) {
        for (const p of toArchive) {
          await supabase.from("posts").update({ 
            archived: true, 
            archived_at: new Date().toISOString() 
          } as any).eq("id", p.id);
          p.archived = true;
          p.archivedAt = new Date();
        }
      }

      setPosts(fetchedPosts);
      
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
      insertData.deadline = serializePostDeadline(post.deadline);
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

  const ensureAgendadosColumn = useCallback(async (): Promise<string> => {
    const { data: existingCols } = await supabase
      .from("columns")
      .select("id, name")
      .eq("client_id", clientId);

    const agendadosCol = (existingCols || []).find((c: any) => c.name.toLowerCase() === "agendados");
    if (agendadosCol) return agendadosCol.id;

    const maxPos = (existingCols || []).length;
    const { data: newCol } = await supabase
      .from("columns")
      .insert({ client_id: clientId, name: "Agendados", position: maxPos } as any)
      .select()
      .single();
    if (newCol) {
      setColumns((prev) => [...prev, { id: (newCol as any).id, clientId, name: "Agendados", position: maxPos, visibleToClient: false }]);
      return (newCol as any).id;
    }
    throw new Error("Failed to create Agendados column");
  }, [clientId]);

  const updatePostStatus = useCallback(async (id: string, status: PostStatus[]) => {
    const updates: Record<string, any> = { status };
    const post = posts.find(p => p.id === id);

    // If "agendado" status is being added, move to "Agendados" column
    let newColumnId: string | undefined;
    if (status.includes("agendado")) {
      try {
        newColumnId = await ensureAgendadosColumn();
        updates.column_id = newColumnId;
      } catch (e) {
        console.error("Failed to ensure Agendados column", e);
      }
    }

    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status, ...(newColumnId ? { columnId: newColumnId } : {}) } : p)));
    await supabase.from("posts").update(updates as any).eq("id", id);
    pushToTrello(id, "update");


  }, [posts, clientId, ensureAgendadosColumn]);

  const updateClientLabel = useCallback(async (id: string, label: ClientLabel) => {
    try {
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

      const post = posts.find(p => p.id === id);
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, clientLabel: label, ...(newColumnId ? { columnId: newColumnId } : {}) } : p)));
      await supabase.from("posts").update(dbUpdates as any).eq("id", id);

      // Log approval or change request
      const action = label === "aprovado" ? "post_approved" : label === "alteracao_solicitada" ? "post_change_requested" : null;
      if (action) {
        const { data: cl } = await supabase.from("clients").select("name").eq("id", clientId).maybeSingle();
        logActivity({
          action,
          itemType: "post",
          itemId: id,
          itemTitle: post?.title || "",
          clientId,
          clientName: (cl as any)?.name || "",
        }).catch(() => {});
      }
    } catch (err) {
      console.error("[updateClientLabel] Error:", err);
    }
  }, [clientId, posts]);

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
  }, [posts, clientId]);

  const deleteComment = useCallback(async (postId: string, commentId: string) => {
    await supabase.from("comments").delete().eq("id", commentId);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) } : p));
  }, []);

  const updateComment = useCallback(async (postId: string, commentId: string, text: string) => {
    await supabase.from("comments").update({ text }).eq("id", commentId);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments: p.comments.map((c) => c.id === commentId ? { ...c, text } : c) } : p));
  }, []);

  const deletePost = useCallback(async (id: string) => {
    const prevSnapshot = posts;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    const { data, error } = await supabase
      .from("posts")
      .delete()
      .eq("id", id)
      .select("id");
    if (error || !data || data.length === 0) {
      console.error("[deletePost] Falha ao excluir post:", { id, error, deletedRows: data?.length ?? 0 });
      // Reverte estado local para refletir realidade do banco
      setPosts(prevSnapshot);
      throw new Error(error?.message || "Não foi possível excluir o post (sem permissão ou já removido).");
    }
  }, [posts]);

  /**
   * After the automation engine writes to the DB, re-fetch the affected post
   * row so local state mirrors persisted state on every device.
   */
  const refreshPostFromDb = useCallback(async (postId: string) => {
    const { data } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
    if (!data) return;
    setPosts((prev) => {
      const idx = prev.findIndex((p) => p.id === postId);
      if (idx === -1) return prev;
      const existing = prev[idx];
      const refreshed = dbPostToPost(data, existing.comments);
      const next = [...prev];
      next[idx] = refreshed;
      return next;
    });
  }, []);

  /**
   * Centralized invocation of the automation engine. Used by every mutation
   * site that adds tags or moves a card between columns.
   */
  const triggerAutomations = useCallback(
    async (params: {
      postId: string;
      addedTagIds?: string[];
      removedTagIds?: string[];
      newColumnId?: string | null;
      previousColumnId?: string | null;
    }): Promise<AutomationResult | null> => {
      if (!clientId) return null;
      const tagIdToName = new Map(tags.map((t) => [t.id, t.name]));
      const result = await runAutomationsForPost({
        ctx: { clientId, tagIdToName },
        postId: params.postId,
        addedTagIds: params.addedTagIds,
        removedTagIds: params.removedTagIds,
        newColumnId: params.newColumnId,
        previousColumnId: params.previousColumnId,
      });
      // Step 4 — refresh UI from persisted state if any action mutated the row.
      if (result.appliedActions.some((a) => a.success)) {
        await refreshPostFromDb(params.postId);
      }
      return result;
    },
    [clientId, tags, refreshPostFromDb]
  );


  const updatePost = useCallback(async (id: string, updates: Partial<Post>) => {
    const normalizedUpdates = {
      ...updates,
      ...(updates.deadline !== undefined ? { deadline: parsePostDeadline(updates.deadline) } : {}),
    };

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

      // "Aprovado pela Boss" tag on Aplikasi client → move to column + notify
      const APLIKASI_CLIENT_ID = "6ef3d8b4-6028-4e7a-9911-01918c624fff";
      const BOSS_TAG = "aprovado pela boss";
      const hadBossTag = currentPost?.tags.some(t => t.toLowerCase() === BOSS_TAG) ?? false;
      const hasBossTag = updates.tags.some(t => t.toLowerCase() === BOSS_TAG);
      if (!hadBossTag && hasBossTag && clientId === APLIKASI_CLIENT_ID) {
        // Move to "Aprovados pela Boss" column
        try {
          const { data: existingCols } = await supabase
            .from("columns")
            .select("id, name")
            .eq("client_id", clientId);
          const bossCol = (existingCols || []).find((c: any) => c.name.toLowerCase() === "aprovados pela boss");
          let bossColId: string;
          if (bossCol) {
            bossColId = bossCol.id;
          } else {
            const maxPos = (existingCols || []).length;
            const { data: newCol } = await supabase
              .from("columns")
              .insert({ client_id: clientId, name: "Aprovados pela Boss", position: maxPos } as any)
              .select()
              .single();
            bossColId = (newCol as any).id;
            setColumns((prev) => [...prev, { id: bossColId, clientId, name: "Aprovados pela Boss", position: maxPos, visibleToClient: false }]);
          }
          updates.columnId = bossColId;
          normalizedUpdates.columnId = bossColId;
        } catch (e) {
          console.error("Failed to move to Aprovados pela Boss column", e);
        }

        // Send notification to client users assigned to this client
        try {
          const { data: assignments } = await supabase
            .from("user_client_assignments")
            .select("user_id")
            .eq("client_id", clientId);
          const { data: clientUsers } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "client");
          const clientUserIds = (clientUsers || []).map((u: any) => u.user_id);
          const targetUsers = (assignments || [])
            .filter((a: any) => clientUserIds.includes(a.user_id))
            .map((a: any) => a.user_id);

          const postTitle = currentPost?.title || updates.title || "";
          if (targetUsers.length > 0) {
            const notifs = targetUsers.map((uid: string) => ({
              user_id: uid,
              client_id: clientId,
              post_id: id,
              title: "Post aprovado pela Boss",
              message: `O post "${postTitle}" foi aprovado pela Boss! 🎉`,
              type: "boss_approval",
              actor_avatar_url: "",
            }));
            await supabase.from("admin_notifications").insert(notifs);
          }
        } catch (e) {
          console.error("Failed to send boss approval notification", e);
        }
      }
    }

    // If media is being replaced/removed, delete old storage files that are no longer referenced
    if (updates.mediaUrls !== undefined || updates.imageUrl !== undefined) {
      const prevPost = posts.find((p) => p.id === id);
      if (prevPost) {
        const oldUrls = [
          ...(prevPost.mediaUrls || []),
          ...(prevPost.imageUrl ? [prevPost.imageUrl] : []),
        ];
        const newUrls = [
          ...(updates.mediaUrls ?? prevPost.mediaUrls ?? []),
          ...((updates.imageUrl ?? prevPost.imageUrl) ? [updates.imageUrl ?? prevPost.imageUrl] : []),
        ];
        const { deleteRemovedMedia } = await import("@/lib/mediaCleanup");
        deleteRemovedMedia(oldUrls, newUrls).catch((e) => console.error(e));
      }
    }

    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...normalizedUpdates } : p)));
    const dbUpdates: Record<string, any> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.mediaType !== undefined) dbUpdates.media_type = updates.mediaType;
    if (updates.mediaUrls !== undefined) dbUpdates.media_urls = updates.mediaUrls;
    if (updates.caption !== undefined) dbUpdates.caption = updates.caption;
    if (updates.deadline !== undefined) dbUpdates.deadline = serializePostDeadline(updates.deadline);
    if (updates.tags !== undefined) {
      dbUpdates.tags = updates.tags;
      // Set published_at when "publicado" tag is added for retention tracking
      const currentPost = posts.find((p) => p.id === id);
      const hadPublicado = currentPost?.tags.includes("publicado") ?? false;
      const hasPublicado = updates.tags.includes("publicado");
      if (!hadPublicado && hasPublicado) {
        dbUpdates.published_at = new Date().toISOString();
      }
    }
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.clientLabel !== undefined) dbUpdates.client_label = updates.clientLabel;
    if (updates.columnId !== undefined) dbUpdates.column_id = updates.columnId;
    if (updates.archived !== undefined) dbUpdates.archived = updates.archived;
    if (updates.archivedAt !== undefined) dbUpdates.archived_at = updates.archivedAt instanceof Date ? updates.archivedAt.toISOString() : updates.archivedAt;
    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from("posts").update(dbUpdates as any).eq("id", id);
      pushToTrello(id, "update");
    }

    // Run tag-based automations via centralized engine if tags changed
    if (updates.tags !== undefined) {
      const oldTags = posts.find((p) => p.id === id)?.tags || [];
      const addedTagIds = updates.tags.filter((t) => !oldTags.includes(t));
      if (addedTagIds.length > 0) {
        await triggerAutomations({ postId: id, addedTagIds });
      }
    }
  }, [posts, triggerAutomations]);

  const movePostToColumn = useCallback(async (postId: string, columnId: string | null) => {
    const previousColumnId = posts.find((p) => p.id === postId)?.columnId ?? null;
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, columnId } : p)));
    await supabase.from("posts").update({ column_id: columnId } as any).eq("id", postId);
    pushToTrello(postId, "move_column");
    await triggerAutomations({ postId, newColumnId: columnId, previousColumnId });
  }, [posts, triggerAutomations]);


  const uploadMedia = useCallback(async (file: File): Promise<string> => {
    const { compressImage } = await import("@/lib/imageCompressor");
    const compressed = await compressImage(file);
    const ext = compressed.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(fileName, compressed);
    if (error) throw error;
    const { data } = supabase.storage.from("media").getPublicUrl(fileName);
    return data.publicUrl;
  }, []);

  const addTag = useCallback(async (name: string, color: string): Promise<Tag> => {
    const tagId = crypto.randomUUID();
    const { data, error } = await supabase
      .from("tags")
      .insert({ id: tagId, name, color, client_id: clientId } as any)
      .select("id, name, color")
      .single();

    if (error || !data) {
      throw error ?? new Error("Failed to create tag");
    }

    const tag: Tag = { id: data.id, name: data.name, color: data.color };
    setTags((prev) => [...prev, tag]);
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
    // Detect posts that changed column and capture their previous column for the engine
    const movedPosts = orderedPostIds
      .map((id) => {
        const post = posts.find((p) => p.id === id);
        if (post && post.columnId !== columnId) {
          return { id, previousColumnId: post.columnId };
        }
        return null;
      })
      .filter((m): m is { id: string; previousColumnId: string | null } => m !== null);

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

    // Run automations via centralized engine for moved posts
    for (const moved of movedPosts) {
      await triggerAutomations({
        postId: moved.id,
        newColumnId: columnId,
        previousColumnId: moved.previousColumnId,
      });
    }
  }, [posts, triggerAutomations]);


  const setCompanyLogo = useCallback(async (url: string) => {
    setCompanyLogoState(url);
    await supabase.from("clients").update({ logo_url: url } as any).eq("id", clientId);
  }, [clientId]);

  const unarchivePost = useCallback(async (id: string, columnId?: string | null, clientInitiated?: boolean) => {
    const post = [...posts, ...posts].find(p => p.id === id); // check active+archived
    const updates: Partial<Post> = { archived: false, archivedAt: null, status: ["pronto"] as PostStatus[] };
    if (columnId !== undefined) updates.columnId = columnId;
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    const dbUpdates: Record<string, any> = { archived: false, archived_at: null, status: ["pronto"] };
    if (columnId !== undefined) dbUpdates.column_id = columnId;
    if (clientInitiated) dbUpdates.client_unarchived_at = new Date().toISOString();
    await supabase.from("posts").update(dbUpdates as any).eq("id", id);
  }, [posts, clientId]);

  const bulkUpdateStatus = useCallback(async (ids: string[], status: PostStatus[]) => {
    const updates: Record<string, any> = { status };
    setPosts((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, status } : p));
    await supabase.from("posts").update(updates as any).in("id", ids);
  }, []);

  const bulkDeletePosts = useCallback(async (ids: string[]) => {
    const prevSnapshot = posts;
    setPosts((prev) => prev.filter((p) => !ids.includes(p.id)));
    const { data, error } = await supabase
      .from("posts")
      .delete()
      .in("id", ids)
      .select("id");
    const deletedCount = data?.length ?? 0;
    if (error || deletedCount < ids.length) {
      console.error("[bulkDeletePosts] Falha parcial/total ao excluir posts:", {
        requested: ids.length,
        deleted: deletedCount,
        error,
      });
      // Recarrega do banco para refletir o estado real
      const { data: fresh } = await supabase
        .from("posts")
        .select("*")
        .eq("client_id", clientId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (fresh) {
        const commentsMap = new Map<string, Comment[]>();
        prevSnapshot.forEach((p) => commentsMap.set(p.id, p.comments));
        setPosts(fresh.map((row: any) => dbPostToPost(row, commentsMap.get(row.id) || [])));
      } else {
        setPosts(prevSnapshot);
      }
      if (error) throw new Error(error.message);
    }
  }, [posts, clientId]);

  const bulkMoveToColumn = useCallback(async (ids: string[], columnId: string | null) => {
    // Capture previous columns BEFORE local mutation so the engine can detect actual moves.
    const previousByPost = new Map(
      ids.map((id) => [id, posts.find((p) => p.id === id)?.columnId ?? null] as const)
    );
    setPosts((prev) => prev.map((p) => ids.includes(p.id) ? { ...p, columnId } : p));
    await supabase.from("posts").update({ column_id: columnId } as any).in("id", ids);
    // Fan out automations through the centralized engine.
    for (const id of ids) {
      await triggerAutomations({
        postId: id,
        newColumnId: columnId,
        previousColumnId: previousByPost.get(id) ?? null,
      });
    }
  }, [posts, triggerAutomations]);


  const activePosts = posts.filter((p) => !p.archived);
  const archivedPosts = posts.filter((p) => p.archived);

  return (
    <PostsContext.Provider value={{
      clientId, posts: activePosts, archivedPosts, tags, columns, postingPeriod, companyLogo, setPostingPeriod, setCompanyLogo,
      addPost, updatePostStatus, updateClientLabel, addComment, deleteComment, updateComment, deletePost, updatePost,
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
