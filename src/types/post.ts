export type PostStatus = "em_desenvolvimento" | "escrevendo_legenda" | "pronto";
export type ClientLabel = "aprovado" | "alteracao_solicitada" | "leia_comentario" | "pendente" | "de_seu_feedback";

export interface Tag {
  id: string;
  name: string;
  color: string; // hex color
}

export interface Comment {
  id: string;
  postId: string;
  author: string;
  text: string;
  createdAt: Date;
}

export interface Post {
  id: string;
  title: string;
  imageUrl: string;
  caption: string;
  deadline: Date;
  status: PostStatus;
  clientLabel: ClientLabel;
  comments: Comment[];
  tags: string[]; // tag ids
  createdAt: Date;
}

export const DEFAULT_TAGS: Tag[] = [
  { id: "seo", name: "SEO", color: "#3b82f6" },
  { id: "alterado", name: "Alterado", color: "#f59e0b" },
  { id: "agendado", name: "Agendado", color: "#8b5cf6" },
  { id: "publicado", name: "Publicado", color: "#22c55e" },
];

export const STATUS_CONFIG: Record<PostStatus, { label: string; color: string }> = {
  em_desenvolvimento: { label: "Em Desenvolvimento", color: "bg-info text-info-foreground" },
  escrevendo_legenda: { label: "Escrevendo Legenda", color: "bg-warning text-warning-foreground" },
  pronto: { label: "Pronto", color: "bg-success text-success-foreground" },
};

export const LABEL_CONFIG: Record<ClientLabel, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-muted text-muted-foreground" },
  aprovado: { label: "Aprovado", color: "bg-success text-success-foreground" },
  alteracao_solicitada: { label: "Alteração Solicitada", color: "bg-destructive text-destructive-foreground" },
  leia_comentario: { label: "Leia Comentário", color: "bg-warning text-warning-foreground" },
};
