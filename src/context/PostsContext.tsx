import React, { createContext, useContext, useState, useCallback } from "react";
import { Post, PostStatus, ClientLabel, Comment } from "@/types/post";

interface PostsContextType {
  posts: Post[];
  addPost: (post: Omit<Post, "id" | "comments" | "createdAt" | "clientLabel">) => void;
  updatePostStatus: (id: string, status: PostStatus) => void;
  updateClientLabel: (id: string, label: ClientLabel) => void;
  addComment: (postId: string, author: string, text: string) => void;
  deletePost: (id: string) => void;
  updatePost: (id: string, updates: Partial<Post>) => void;
}

const PostsContext = createContext<PostsContextType | undefined>(undefined);

const SAMPLE_POSTS: Post[] = [
  {
    id: "1",
    title: "Post Instagram - Campanha Verão",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop",
    caption: "☀️ O verão chegou e com ele nossas melhores ofertas! Aproveite descontos de até 50% em toda a coleção. #Verão2024 #Moda",
    deadline: new Date("2026-03-20"),
    status: "em_desenvolvimento",
    clientLabel: "pendente",
    comments: [],
    createdAt: new Date("2026-03-08"),
  },
  {
    id: "2",
    title: "Story - Lançamento Produto",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
    caption: "🚀 Novo produto chegando! Fique ligado para o grande lançamento desta semana.",
    deadline: new Date("2026-03-15"),
    status: "escrevendo_legenda",
    clientLabel: "leia_comentario",
    comments: [
      { id: "c1", postId: "2", author: "Cliente", text: "Podemos trocar a cor de fundo?", createdAt: new Date("2026-03-10") },
    ],
    createdAt: new Date("2026-03-05"),
  },
  {
    id: "3",
    title: "Carrossel - Dicas de Bem-estar",
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop",
    caption: "🧘 5 dicas para manter o equilíbrio no dia a dia. Swipe para ver todas! #BemEstar #Saúde",
    deadline: new Date("2026-03-12"),
    status: "pronto",
    clientLabel: "aprovado",
    comments: [
      { id: "c2", postId: "3", author: "Cliente", text: "Perfeito! Aprovado!", createdAt: new Date("2026-03-11") },
    ],
    createdAt: new Date("2026-03-01"),
  },
];

export const PostsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [posts, setPosts] = useState<Post[]>(SAMPLE_POSTS);

  const addPost = useCallback((post: Omit<Post, "id" | "comments" | "createdAt" | "clientLabel">) => {
    setPosts((prev) => [
      ...prev,
      {
        ...post,
        id: crypto.randomUUID(),
        comments: [],
        clientLabel: "pendente",
        createdAt: new Date(),
      },
    ]);
  }, []);

  const updatePostStatus = useCallback((id: string, status: PostStatus) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }, []);

  const updateClientLabel = useCallback((id: string, label: ClientLabel) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, clientLabel: label } : p)));
  }, []);

  const addComment = useCallback((postId: string, author: string, text: string) => {
    const comment: Comment = { id: crypto.randomUUID(), postId, author, text, createdAt: new Date() };
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, comment] } : p))
    );
  }, []);

  const deletePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePost = useCallback((id: string, updates: Partial<Post>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  return (
    <PostsContext.Provider value={{ posts, addPost, updatePostStatus, updateClientLabel, addComment, deletePost, updatePost }}>
      {children}
    </PostsContext.Provider>
  );
};

export const usePosts = () => {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error("usePosts must be used within PostsProvider");
  return ctx;
};
