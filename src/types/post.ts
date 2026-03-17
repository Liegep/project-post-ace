export type PostStatus = "entrada" | "em_desenvolvimento" | "escrevendo_legenda" | "pronto" | "finalizado" | "alteracao_solicitada";
export type ClientLabel = "aprovado" | "alteracao_solicitada" | "leia_comentario" | "pendente" | "de_seu_feedback";

export interface Tag {
  id: string;
  name: string;
  color: string; // hex color
}

export interface Column {
  id: string;
  clientId: string;
  name: string;
  position: number;
  visibleToClient: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  author: string;
  text: string;
  createdAt: Date;
}

export type MediaType = "image" | "video";

export interface Post {
  id: string;
  title: string;
  imageUrl: string;
  mediaType: MediaType;
  mediaUrls: string[];
  caption: string;
  deadline: Date;
  status: PostStatus;
  clientLabel: ClientLabel;
  comments: Comment[];
  tags: string[]; // tag ids
  createdAt: Date;
  columnId: string | null;
  position: number;
  archived: boolean;
  archivedAt: Date | null;
  trelloCardId: string | null;
}

export const DEFAULT_TAGS: Tag[] = [
  { id: "seo", name: "SEO", color: "#3b82f6" },
  { id: "alterado", name: "Alterado", color: "#f59e0b" },
  { id: "agendado", name: "Agendado", color: "#8b5cf6" },
  { id: "publicado", name: "Publicado", color: "#22c55e" },
  { id: "alteracao_solicitada", name: "Alteração Solicitada", color: "#ef4444" },
];

export const TAG_TRANSLATION_KEYS: Record<string, "tagSEO" | "tagAltered" | "tagScheduled" | "tagPublished" | "tagChangeRequested"> = {
  seo: "tagSEO",
  alterado: "tagAltered",
  agendado: "tagScheduled",
  publicado: "tagPublished",
  alteracao_solicitada: "tagChangeRequested",
};

export const STATUS_CONFIG: Record<PostStatus, { label: string; color: string }> = {
  entrada: { label: "Entrada", color: "bg-muted text-muted-foreground" },
  em_desenvolvimento: { label: "Em Desenvolvimento", color: "bg-info text-info-foreground" },
  escrevendo_legenda: { label: "Escrevendo Legenda", color: "bg-warning text-warning-foreground" },
  pronto: { label: "Pronto", color: "bg-success text-success-foreground" },
  finalizado: { label: "Finalizado", color: "bg-primary text-primary-foreground" },
};

export const LABEL_CONFIG: Record<ClientLabel, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-muted text-muted-foreground" },
  aprovado: { label: "Aprovado", color: "bg-success text-success-foreground" },
  alteracao_solicitada: { label: "Alteração Solicitada", color: "bg-destructive text-destructive-foreground" },
  leia_comentario: { label: "Leia Comentário", color: "bg-warning text-warning-foreground" },
  de_seu_feedback: { label: "Dê seu Feedback", color: "bg-info text-info-foreground" },
};
