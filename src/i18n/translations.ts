export type Locale = "pt" | "en" | "it" | "es" | "sv";

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: "Português",
  en: "English",
  it: "Italiano",
  es: "Español",
  sv: "Svenska",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  pt: "🇧🇷",
  en: "🇺🇸",
  it: "🇮🇹",
  es: "🇪🇸",
  sv: "🇸🇪",
};

type TranslationKeys = {
  // Admin header
  adminTitle: string;
  adminSubtitle: string;
  newPost: string;
  // Status labels
  statusEntry: string;
  statusInDevelopment: string;
  statusWritingCaption: string;
  statusReady: string;
  statusFinalized: string;
  // Client labels
  labelPending: string;
  labelApproved: string;
  labelChangeRequested: string;
  labelReadComment: string;
  labelGiveFeedback: string;
  // Post card
  overdue: string;
  comments: string;
  comment: string;
  noComments: string;
  writeComment: string;
  // Create dialog
  createNewPost: string;
  title: string;
  titlePlaceholder: string;
  image: string;
  clickToSelectImage: string;
  caption: string;
  captionPlaceholder: string;
  deadline: string;
  status: string;
  tags: string;
  createPost: string;
  // Tags
  newTag: string;
  createTag: string;
  tagNamePlaceholder: string;
  color: string;
  create: string;
  // Kanban
  noPosts: string;
  // Client page
  postsForApproval: string;
  clientTitle: string;
  clientSubtitle: string;
  noPostsToReview: string;
  // Language
  language: string;
  // Edit
  editPost: string;
  saveChanges: string;
  // Tags translated
  tagSEO: string;
  tagAltered: string;
  tagScheduled: string;
  tagPublished: string;
  tagChangeRequested: string;
  // Media
  media: string;
  clickToSelectMedia: string;
  // Posting period
  postingPeriod: string;
  editPeriodPlaceholder: string;
  // Read more
  readMore: string;
  readLess: string;
  // Publish forecast
  publishForecast: string;
};

const pt: TranslationKeys = {
  adminTitle: "Painel de Conteúdo",
  adminSubtitle: "Gerencie seus posts e aprovações",
  newPost: "Novo Post",
  statusEntry: "Entrada",
  statusInDevelopment: "Em Desenvolvimento",
  statusWritingCaption: "Escrevendo Legenda",
  statusReady: "Pronto",
  statusFinalized: "Finalizado",
  labelPending: "Pendente",
  labelApproved: "Aprovado",
  labelChangeRequested: "Alteração Solicitada",
  labelReadComment: "Leia Comentário",
  labelGiveFeedback: "Dê seu Feedback",
  overdue: "atrasado",
  comments: "comentários",
  comment: "comentário",
  noComments: "Nenhum comentário ainda.",
  writeComment: "Escreva um comentário...",
  createNewPost: "Criar Novo Post",
  title: "Título",
  titlePlaceholder: "Ex: Post Instagram - Campanha",
  image: "Imagem",
  clickToSelectImage: "Clique para selecionar uma imagem",
  caption: "Legenda",
  captionPlaceholder: "Escreva a legenda do post...",
  deadline: "Deadline",
  status: "Status",
  tags: "Etiquetas",
  createPost: "Criar Post",
  newTag: "Nova",
  createTag: "Criar Etiqueta",
  tagNamePlaceholder: "Nome da etiqueta",
  color: "Cor",
  create: "Criar",
  noPosts: "Nenhum post",
  postsForApproval: "Posts para aprovação",
  clientTitle: "Portal do Cliente",
  clientSubtitle: "Visualize e aprove seus conteúdos",
  noPostsToReview: "Nenhum post para revisar no momento.",
  language: "Idioma",
  editPost: "Editar Post",
  saveChanges: "Salvar Alterações",
  tagSEO: "SEO",
  tagAltered: "Alterado",
  tagScheduled: "Agendado",
  tagPublished: "Publicado",
  tagChangeRequested: "Alteração Solicitada",
  media: "Mídia",
  clickToSelectMedia: "Clique para selecionar imagem ou vídeo",
  postingPeriod: "Período de Postagem",
  editPeriodPlaceholder: "Ex: Março 2026",
  readMore: "Ver mais",
  readLess: "Ver menos",
  publishForecast: "Previsão de Publicação",
};

const en: TranslationKeys = {
  adminTitle: "Content Dashboard",
  adminSubtitle: "Manage your posts and approvals",
  newPost: "New Post",
  statusEntry: "Entry",
  statusInDevelopment: "In Development",
  statusWritingCaption: "Writing Caption",
  statusReady: "Ready",
  statusFinalized: "Finalized",
  labelPending: "Pending",
  labelApproved: "Approved",
  labelChangeRequested: "Change Requested",
  labelReadComment: "Read Comment",
  labelGiveFeedback: "Give Feedback",
  overdue: "overdue",
  comments: "comments",
  comment: "comment",
  noComments: "No comments yet.",
  writeComment: "Write a comment...",
  createNewPost: "Create New Post",
  title: "Title",
  titlePlaceholder: "E.g.: Instagram Post - Campaign",
  image: "Image",
  clickToSelectImage: "Click to select an image",
  caption: "Caption",
  captionPlaceholder: "Write the post caption...",
  deadline: "Deadline",
  status: "Status",
  tags: "Tags",
  createPost: "Create Post",
  newTag: "New",
  createTag: "Create Tag",
  tagNamePlaceholder: "Tag name",
  color: "Color",
  create: "Create",
  noPosts: "No posts",
  postsForApproval: "Posts for approval",
  clientTitle: "Client Portal",
  clientSubtitle: "View and approve your content",
  noPostsToReview: "No posts to review at this time.",
  language: "Language",
  editPost: "Edit Post",
  saveChanges: "Save Changes",
  tagSEO: "SEO",
  tagAltered: "Altered",
  tagScheduled: "Scheduled",
  tagPublished: "Published",
  tagChangeRequested: "Change Requested",
  media: "Media",
  clickToSelectMedia: "Click to select image or video",
  postingPeriod: "Posting Period",
  editPeriodPlaceholder: "E.g.: March 2026",
  readMore: "Read more",
  readLess: "Read less",
  publishForecast: "Publish Forecast",
};

const it: TranslationKeys = {
  adminTitle: "Pannello Contenuti",
  adminSubtitle: "Gestisci i tuoi post e le approvazioni",
  newPost: "Nuovo Post",
  statusEntry: "Ingresso",
  statusInDevelopment: "In Sviluppo",
  statusWritingCaption: "Scrittura Didascalia",
  statusReady: "Pronto",
  statusFinalized: "Finalizzato",
  labelPending: "In Attesa",
  labelApproved: "Approvato",
  labelChangeRequested: "Modifica Richiesta",
  labelReadComment: "Leggi Commento",
  labelGiveFeedback: "Dai il tuo Feedback",
  overdue: "in ritardo",
  comments: "commenti",
  comment: "commento",
  noComments: "Nessun commento ancora.",
  writeComment: "Scrivi un commento...",
  createNewPost: "Crea Nuovo Post",
  title: "Titolo",
  titlePlaceholder: "Es: Post Instagram - Campagna",
  image: "Immagine",
  clickToSelectImage: "Clicca per selezionare un'immagine",
  caption: "Didascalia",
  captionPlaceholder: "Scrivi la didascalia del post...",
  deadline: "Scadenza",
  status: "Stato",
  tags: "Etichette",
  createPost: "Crea Post",
  newTag: "Nuova",
  createTag: "Crea Etichetta",
  tagNamePlaceholder: "Nome etichetta",
  color: "Colore",
  create: "Crea",
  noPosts: "Nessun post",
  postsForApproval: "Post da approvare",
  clientTitle: "Portale Cliente",
  clientSubtitle: "Visualizza e approva i tuoi contenuti",
  noPostsToReview: "Nessun post da revisionare al momento.",
  language: "Lingua",
  editPost: "Modifica Post",
  saveChanges: "Salva Modifiche",
  tagSEO: "SEO",
  tagAltered: "Modificato",
  tagScheduled: "Programmato",
  tagPublished: "Pubblicato",
  tagChangeRequested: "Modifica Richiesta",
  media: "Media",
  clickToSelectMedia: "Clicca per selezionare immagine o video",
  postingPeriod: "Periodo di Pubblicazione",
  editPeriodPlaceholder: "Es: Marzo 2026",
  readMore: "Leggi di più",
  readLess: "Leggi meno",
  publishForecast: "Previsione di Pubblicazione",
};

const es: TranslationKeys = {
  adminTitle: "Panel de Contenido",
  adminSubtitle: "Gestiona tus publicaciones y aprobaciones",
  newPost: "Nueva Publicación",
  statusEntry: "Entrada",
  statusInDevelopment: "En Desarrollo",
  statusWritingCaption: "Escribiendo Leyenda",
  statusReady: "Listo",
  statusFinalized: "Finalizado",
  labelPending: "Pendiente",
  labelApproved: "Aprobado",
  labelChangeRequested: "Cambio Solicitado",
  labelReadComment: "Leer Comentario",
  labelGiveFeedback: "Da tu Feedback",
  overdue: "atrasado",
  comments: "comentarios",
  comment: "comentario",
  noComments: "Sin comentarios aún.",
  writeComment: "Escribe un comentario...",
  createNewPost: "Crear Nueva Publicación",
  title: "Título",
  titlePlaceholder: "Ej: Post Instagram - Campaña",
  image: "Imagen",
  clickToSelectImage: "Haz clic para seleccionar una imagen",
  caption: "Leyenda",
  captionPlaceholder: "Escribe la leyenda del post...",
  deadline: "Fecha límite",
  status: "Estado",
  tags: "Etiquetas",
  createPost: "Crear Publicación",
  newTag: "Nueva",
  createTag: "Crear Etiqueta",
  tagNamePlaceholder: "Nombre de la etiqueta",
  color: "Color",
  create: "Crear",
  noPosts: "Sin publicaciones",
  postsForApproval: "Publicaciones para aprobación",
  clientTitle: "Portal del Cliente",
  clientSubtitle: "Visualiza y aprueba tu contenido",
  noPostsToReview: "No hay publicaciones para revisar en este momento.",
  language: "Idioma",
  editPost: "Editar Publicación",
  saveChanges: "Guardar Cambios",
  tagSEO: "SEO",
  tagAltered: "Alterado",
  tagScheduled: "Programado",
  tagPublished: "Publicado",
  tagChangeRequested: "Alteración Solicitada",
  media: "Medios",
  clickToSelectMedia: "Haz clic para seleccionar imagen o video",
  postingPeriod: "Período de Publicación",
  editPeriodPlaceholder: "Ej: Marzo 2026",
  readMore: "Leer más",
  readLess: "Leer menos",
  publishForecast: "Previsión de Publicación",
};

const sv: TranslationKeys = {
  adminTitle: "Innehållspanel",
  adminSubtitle: "Hantera dina inlägg och godkännanden",
  newPost: "Nytt Inlägg",
  statusEntry: "Inkommande",
  statusInDevelopment: "Under Utveckling",
  statusWritingCaption: "Skriver Bildtext",
  statusReady: "Klart",
  statusFinalized: "Avslutat",
  labelPending: "Väntande",
  labelApproved: "Godkänt",
  labelChangeRequested: "Ändring Begärd",
  labelReadComment: "Läs Kommentar",
  labelGiveFeedback: "Ge din Feedback",
  overdue: "försenad",
  comments: "kommentarer",
  comment: "kommentar",
  noComments: "Inga kommentarer ännu.",
  writeComment: "Skriv en kommentar...",
  createNewPost: "Skapa Nytt Inlägg",
  title: "Titel",
  titlePlaceholder: "T.ex.: Instagram-inlägg - Kampanj",
  image: "Bild",
  clickToSelectImage: "Klicka för att välja en bild",
  caption: "Bildtext",
  captionPlaceholder: "Skriv inläggets bildtext...",
  deadline: "Deadline",
  status: "Status",
  tags: "Etiketter",
  createPost: "Skapa Inlägg",
  newTag: "Ny",
  createTag: "Skapa Etikett",
  tagNamePlaceholder: "Etikettnamn",
  color: "Färg",
  create: "Skapa",
  noPosts: "Inga inlägg",
  postsForApproval: "Inlägg för godkännande",
  clientTitle: "Kundportal",
  clientSubtitle: "Visa och godkänn ditt innehåll",
  noPostsToReview: "Inga inlägg att granska just nu.",
  language: "Språk",
  editPost: "Redigera Inlägg",
  saveChanges: "Spara Ändringar",
  tagSEO: "SEO",
  tagAltered: "Ändrad",
  tagScheduled: "Schemalagd",
  tagPublished: "Publicerad",
  media: "Media",
  clickToSelectMedia: "Klicka för att välja bild eller video",
  postingPeriod: "Publiceringsperiod",
  editPeriodPlaceholder: "T.ex.: Mars 2026",
  readMore: "Läs mer",
  readLess: "Läs mindre",
  publishForecast: "Publiceringsförhandsvisning",
};

export const translations: Record<Locale, TranslationKeys> = { pt, en, it, es, sv };
