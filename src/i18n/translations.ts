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
  statusChangeRequested: string;
  statusScheduled: string;
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
  // Admin Dashboard
  selectOrCreateClient: string;
  postsForToday: string;
  clientFeedbacks: string;
  restoredByClient: string;
  restored: string;
  postsCreatedByClient: string;
  createdByClient: string;
  noClientsYet: string;
  createFirstClient: string;
  createClient: string;
  manage: string;
  editClient: string;
  newClient: string;
  clientName: string;
  clientNamePlaceholder: string;
  slugUrl: string;
  clientLanguage: string;
  logo: string;
  selectLogo: string;
  change: string;
  save: string;
  password: string;
  changePassword: string;
  newPassword: string;
  confirmNewPassword: string;
  minChars: string;
  repeatPassword: string;
  saving: string;
  saveNewPassword: string;
  passwordUpdated: string;
  passwordMinError: string;
  passwordMismatch: string;
  passwordUpdateError: string;
  invite: string;
  inviteAdmin: string;
  invitations: string;
  accepted: string;
  expired: string;
  pending: string;
  linkCopied: string;
  inviteCreated: string;
  inviteError: string;
  social: string;
  signOut: string;
  confirmDeleteClient: string;
  // Admin Page (Kanban)
  noColumn: string;
  columnLabel: string;
  columnName: string;
  cancel: string;
  newColumn: string;
  addPost: string;
  visibleToClient: string;
  hiddenFromClient: string;
  board: string;
  archived: string;
  noArchivedPosts: string;
  archivedPostsAppearHere: string;
  restore: string;
  deletePermanently: string;
  select: string;
  createTracking: string;
  trelloSync: string;
  clickToSetPeriod: string;
  selected: string;
  changeStatus: string;
  moveToColumn: string;
  archive: string;
  deleteAction: string;
  // Bulk actions
  postsUpdated: string;
  postsDeleted: string;
  postsRestored: string;
  postsMoved: string;
  confirmBulkDelete: string;
  // Column actions
  deleteColumnConfirm: string;
  columnCreateError: string;
  // Client edit permissions
  clientCanEditCaption: string;
  clientCannotEditCaption: string;
  clientCanCreatePosts: string;
  clientCannotCreatePosts: string;
  trackingActive: string;
  trackingCreated: string;
  trackingCreatedDesc: string;
  // Trello
  syncWithTrello: string;
  trelloBoardId: string;
  trelloBoardIdPlaceholder: string;
  trelloBoardIdHelp: string;
  trelloSyncWarning: string;
  syncing: string;
  startSync: string;
  syncComplete: string;
  syncError: string;
  // Post sent by client
  postSentSuccess: string;
  postSentDesc: string;
  // Team management
  teamManagement: string;
  manageTeamMembers: string;
  newMember: string;
  noTeamMembers: string;
  createFirstMember: string;
  createMember: string;
  fullName: string;
  fullNamePlaceholder: string;
  assignClients: string;
  assignClientsTo: string;
  noClientsAssigned: string;
  teamMemberCreated: string;
  assignmentsUpdated: string;
  confirmDeleteMember: string;
  memberDeleted: string;
  team: string;
  // Team dashboard
  hello: string;
  teamMember: string;
  yourClients: string;
  myClients: string;
  contactAdmin: string;
  notifications: string;
  adminFeedback: string;
  statusUpdated: string;
  // User profile menu
  myProfile: string;
  editProfileDesc: string;
  profileUpdated: string;
  changePasswordDesc: string;
  error: string;
  // Invite unified
  inviteMember: string;
  inviteMemberDesc: string;
  roleLabel: string;
  sendInvite: string;
};

const pt: TranslationKeys = {
  adminTitle: "Painel de Conteúdo",
  adminSubtitle: "Gerencie seus posts e aprovações",
  newPost: "Novo Post",
  statusEntry: "Entrada",
  statusInDevelopment: "Em Desenvolvimento",
  statusWritingCaption: "Escrevendo Legenda",
  statusReady: "Enviar para Cliente",
  statusFinalized: "Finalizado",
  statusChangeRequested: "Alteração Solicitada",
  statusScheduled: "Agendado",
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
  // Admin Dashboard
  selectOrCreateClient: "Selecione ou crie um cliente",
  postsForToday: "Posts para Hoje",
  clientFeedbacks: "Feedbacks dos Clientes",
  restoredByClient: "Posts Restaurados pelo Cliente",
  restored: "Restaurado",
  postsCreatedByClient: "Posts Criados pelo Cliente",
  createdByClient: "Criado pelo cliente",
  noClientsYet: "Nenhum cliente ainda",
  createFirstClient: "Crie seu primeiro cliente para começar",
  createClient: "Criar Cliente",
  manage: "Gerenciar",
  editClient: "Editar Cliente",
  newClient: "Novo Cliente",
  clientName: "Nome do Cliente",
  clientNamePlaceholder: "Ex: Empresa XYZ",
  slugUrl: "Slug (URL)",
  clientLanguage: "Idioma do Cliente",
  logo: "Logo",
  selectLogo: "Selecionar logo",
  change: "Alterar",
  save: "Salvar",
  password: "Senha",
  changePassword: "Alterar Senha",
  newPassword: "Nova senha",
  confirmNewPassword: "Confirmar nova senha",
  minChars: "Mínimo 6 caracteres",
  repeatPassword: "Repita a senha",
  saving: "Salvando...",
  saveNewPassword: "Salvar nova senha",
  passwordUpdated: "Senha atualizada com sucesso!",
  passwordMinError: "A senha deve ter pelo menos 6 caracteres",
  passwordMismatch: "As senhas não coincidem",
  passwordUpdateError: "Erro ao atualizar senha",
  invite: "Convidar",
  inviteAdmin: "Convidar Administrador",
  invitations: "Convites",
  accepted: "Aceito",
  expired: "Expirado",
  pending: "Pendente",
  linkCopied: "Link copiado!",
  inviteCreated: "Convite criado!",
  inviteError: "Erro ao enviar convite",
  social: "Social",
  signOut: "Sair",
  confirmDeleteClient: "Tem certeza que deseja excluir este cliente?",
  // Admin Page
  noColumn: "Sem coluna",
  columnLabel: "Coluna",
  columnName: "Nome da coluna",
  cancel: "Cancelar",
  newColumn: "Nova coluna",
  addPost: "Adicionar post",
  visibleToClient: "Visível para o cliente",
  hiddenFromClient: "Oculto para o cliente",
  board: "Quadro",
  archived: "Arquivados",
  noArchivedPosts: "Nenhum post arquivado",
  archivedPostsAppearHere: "Posts com status \"Finalizado\" aparecerão aqui",
  restore: "Restaurar",
  deletePermanently: "Excluir permanentemente?",
  select: "Selecionar",
  createTracking: "Criar Acompanhamento",
  trelloSync: "Trello Sync",
  clickToSetPeriod: "Clique para definir o período",
  selected: "selecionado(s)",
  changeStatus: "Mudar status",
  moveToColumn: "Mover p/ coluna",
  archive: "Arquivar",
  deleteAction: "Excluir",
  postsUpdated: "posts atualizados",
  postsDeleted: "posts excluídos",
  postsRestored: "posts restaurados",
  postsMoved: "posts movidos",
  confirmBulkDelete: "Excluir {count} posts permanentemente?",
  deleteColumnConfirm: "Excluir esta coluna? Os posts serão movidos para 'Sem coluna'.",
  columnCreateError: "Erro ao criar coluna",
  clientCanEditCaption: "Cliente pode editar legenda",
  clientCannotEditCaption: "Cliente não edita legenda",
  clientCanCreatePosts: "Cliente pode criar posts",
  clientCannotCreatePosts: "Cliente não cria posts",
  trackingActive: "Acompanhamento ativo",
  trackingCreated: "Acompanhamento criado!",
  trackingCreatedDesc: "A coluna de acompanhamento foi adicionada ao quadro.",
  syncWithTrello: "Sincronizar com Trello",
  trelloBoardId: "Board ID do Trello",
  trelloBoardIdPlaceholder: "Ex: abc123def456",
  trelloBoardIdHelp: "Encontre o Board ID na URL do Trello: trello.com/b/BOARD_ID/nome-do-board",
  trelloSyncWarning: "⚠️ A sincronização substituirá todas as colunas e posts existentes deste cliente.",
  syncing: "Sincronizando...",
  startSync: "Iniciar Sincronização",
  syncComplete: "Sincronização concluída!",
  syncError: "Erro na sincronização",
  postSentSuccess: "✅ Post enviado com sucesso!",
  postSentDesc: "Seu post foi recebido e está aguardando revisão da equipe.",
  teamManagement: "Gestão da Equipe",
  manageTeamMembers: "Gerencie os membros da equipe e atribuições",
  newMember: "Novo Membro",
  noTeamMembers: "Nenhum membro da equipe",
  createFirstMember: "Crie o primeiro membro para começar",
  createMember: "Criar Membro",
  fullName: "Nome Completo",
  fullNamePlaceholder: "Ex: João Silva",
  assignClients: "Atribuir Clientes",
  assignClientsTo: "Atribuir clientes a",
  noClientsAssigned: "Nenhum cliente atribuído",
  teamMemberCreated: "Membro da equipe criado!",
  assignmentsUpdated: "Atribuições atualizadas!",
  confirmDeleteMember: "Tem certeza que deseja remover este membro?",
  memberDeleted: "Membro removido!",
  team: "Equipe",
  hello: "Olá",
  teamMember: "Membro da equipe",
  yourClients: "Seus clientes",
  myClients: "Meus Clientes",
  contactAdmin: "Entre em contato com o administrador para atribuição de clientes",
  notifications: "Notificações",
  adminFeedback: "Feedback do Admin",
  statusUpdated: "Status atualizado!",
  myProfile: "Meu Perfil",
  editProfileDesc: "Edite seu nome e foto",
  profileUpdated: "Perfil atualizado!",
  changePasswordDesc: "Defina uma nova senha",
  error: "Erro",
  inviteMember: "Convidar Membro",
  inviteMemberDesc: "Convide alguém para a equipe ou como administrador",
  roleLabel: "Tipo de acesso",
  sendInvite: "Enviar Convite",
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
  statusChangeRequested: "Change Requested",
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
  selectOrCreateClient: "Select or create a client",
  postsForToday: "Posts for Today",
  clientFeedbacks: "Client Feedbacks",
  restoredByClient: "Posts Restored by Client",
  restored: "Restored",
  postsCreatedByClient: "Posts Created by Client",
  createdByClient: "Created by client",
  noClientsYet: "No clients yet",
  createFirstClient: "Create your first client to get started",
  createClient: "Create Client",
  manage: "Manage",
  editClient: "Edit Client",
  newClient: "New Client",
  clientName: "Client Name",
  clientNamePlaceholder: "E.g.: Company XYZ",
  slugUrl: "Slug (URL)",
  clientLanguage: "Client Language",
  logo: "Logo",
  selectLogo: "Select logo",
  change: "Change",
  save: "Save",
  password: "Password",
  changePassword: "Change Password",
  newPassword: "New password",
  confirmNewPassword: "Confirm new password",
  minChars: "Minimum 6 characters",
  repeatPassword: "Repeat password",
  saving: "Saving...",
  saveNewPassword: "Save new password",
  passwordUpdated: "Password updated successfully!",
  passwordMinError: "Password must be at least 6 characters",
  passwordMismatch: "Passwords do not match",
  passwordUpdateError: "Error updating password",
  invite: "Invite",
  inviteAdmin: "Invite Administrator",
  invitations: "Invitations",
  accepted: "Accepted",
  expired: "Expired",
  pending: "Pending",
  linkCopied: "Link copied!",
  inviteCreated: "Invite created!",
  inviteError: "Error sending invite",
  social: "Social",
  signOut: "Sign out",
  confirmDeleteClient: "Are you sure you want to delete this client?",
  noColumn: "No column",
  columnLabel: "Column",
  columnName: "Column name",
  cancel: "Cancel",
  newColumn: "New column",
  addPost: "Add post",
  visibleToClient: "Visible to client",
  hiddenFromClient: "Hidden from client",
  board: "Board",
  archived: "Archived",
  noArchivedPosts: "No archived posts",
  archivedPostsAppearHere: "Posts with \"Finalized\" status will appear here",
  restore: "Restore",
  deletePermanently: "Delete permanently?",
  select: "Select",
  createTracking: "Create Tracking",
  trelloSync: "Trello Sync",
  clickToSetPeriod: "Click to set the period",
  selected: "selected",
  changeStatus: "Change status",
  moveToColumn: "Move to column",
  archive: "Archive",
  deleteAction: "Delete",
  postsUpdated: "posts updated",
  postsDeleted: "posts deleted",
  postsRestored: "posts restored",
  postsMoved: "posts moved",
  confirmBulkDelete: "Delete {count} posts permanently?",
  deleteColumnConfirm: "Delete this column? Posts will be moved to 'No column'.",
  columnCreateError: "Error creating column",
  clientCanEditCaption: "Client can edit caption",
  clientCannotEditCaption: "Client cannot edit caption",
  clientCanCreatePosts: "Client can create posts",
  clientCannotCreatePosts: "Client cannot create posts",
  trackingActive: "Tracking active",
  trackingCreated: "Tracking created!",
  trackingCreatedDesc: "The tracking column was added to the board.",
  syncWithTrello: "Sync with Trello",
  trelloBoardId: "Trello Board ID",
  trelloBoardIdPlaceholder: "E.g.: abc123def456",
  trelloBoardIdHelp: "Find the Board ID in the Trello URL: trello.com/b/BOARD_ID/board-name",
  trelloSyncWarning: "⚠️ Syncing will replace all existing columns and posts for this client.",
  syncing: "Syncing...",
  startSync: "Start Sync",
  syncComplete: "Sync complete!",
  syncError: "Sync error",
  postSentSuccess: "✅ Post sent successfully!",
  postSentDesc: "Your post was received and is awaiting team review.",
  teamManagement: "Team Management",
  manageTeamMembers: "Manage team members and assignments",
  newMember: "New Member",
  noTeamMembers: "No team members",
  createFirstMember: "Create the first member to get started",
  createMember: "Create Member",
  fullName: "Full Name",
  fullNamePlaceholder: "E.g.: John Doe",
  assignClients: "Assign Clients",
  assignClientsTo: "Assign clients to",
  noClientsAssigned: "No clients assigned",
  teamMemberCreated: "Team member created!",
  assignmentsUpdated: "Assignments updated!",
  confirmDeleteMember: "Are you sure you want to remove this member?",
  memberDeleted: "Member removed!",
  team: "Team",
  hello: "Hello",
  teamMember: "Team member",
  yourClients: "Your clients",
  myClients: "My Clients",
  contactAdmin: "Contact the admin for client assignments",
  notifications: "Notifications",
  adminFeedback: "Admin Feedback",
  statusUpdated: "Status updated!",
  myProfile: "My Profile",
  editProfileDesc: "Edit your name and photo",
  profileUpdated: "Profile updated!",
  changePasswordDesc: "Set a new password",
  error: "Error",
  inviteMember: "Invite Member",
  inviteMemberDesc: "Invite someone as team member or admin",
  roleLabel: "Access type",
  sendInvite: "Send Invite",
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
  statusChangeRequested: "Modifica Richiesta",
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
  selectOrCreateClient: "Seleziona o crea un cliente",
  postsForToday: "Post per Oggi",
  clientFeedbacks: "Feedback dei Clienti",
  restoredByClient: "Post Ripristinati dal Cliente",
  restored: "Ripristinato",
  postsCreatedByClient: "Post Creati dal Cliente",
  createdByClient: "Creato dal cliente",
  noClientsYet: "Nessun cliente ancora",
  createFirstClient: "Crea il tuo primo cliente per iniziare",
  createClient: "Crea Cliente",
  manage: "Gestisci",
  editClient: "Modifica Cliente",
  newClient: "Nuovo Cliente",
  clientName: "Nome del Cliente",
  clientNamePlaceholder: "Es: Azienda XYZ",
  slugUrl: "Slug (URL)",
  clientLanguage: "Lingua del Cliente",
  logo: "Logo",
  selectLogo: "Seleziona logo",
  change: "Modifica",
  save: "Salva",
  password: "Password",
  changePassword: "Cambia Password",
  newPassword: "Nuova password",
  confirmNewPassword: "Conferma nuova password",
  minChars: "Minimo 6 caratteri",
  repeatPassword: "Ripeti la password",
  saving: "Salvando...",
  saveNewPassword: "Salva nuova password",
  passwordUpdated: "Password aggiornata con successo!",
  passwordMinError: "La password deve avere almeno 6 caratteri",
  passwordMismatch: "Le password non corrispondono",
  passwordUpdateError: "Errore nell'aggiornamento della password",
  invite: "Invita",
  inviteAdmin: "Invita Amministratore",
  invitations: "Inviti",
  accepted: "Accettato",
  expired: "Scaduto",
  pending: "In attesa",
  linkCopied: "Link copiato!",
  inviteCreated: "Invito creato!",
  inviteError: "Errore nell'invio dell'invito",
  social: "Social",
  signOut: "Esci",
  confirmDeleteClient: "Sei sicuro di voler eliminare questo cliente?",
  noColumn: "Senza colonna",
  columnLabel: "Colonna",
  columnName: "Nome colonna",
  cancel: "Annulla",
  newColumn: "Nuova colonna",
  addPost: "Aggiungi post",
  visibleToClient: "Visibile al cliente",
  hiddenFromClient: "Nascosto al cliente",
  board: "Bacheca",
  archived: "Archiviati",
  noArchivedPosts: "Nessun post archiviato",
  archivedPostsAppearHere: "I post con stato \"Finalizzato\" appariranno qui",
  restore: "Ripristina",
  deletePermanently: "Eliminare definitivamente?",
  select: "Seleziona",
  createTracking: "Crea Monitoraggio",
  trelloSync: "Trello Sync",
  clickToSetPeriod: "Clicca per impostare il periodo",
  selected: "selezionati",
  changeStatus: "Cambia stato",
  moveToColumn: "Sposta in colonna",
  archive: "Archivia",
  deleteAction: "Elimina",
  postsUpdated: "post aggiornati",
  postsDeleted: "post eliminati",
  postsRestored: "post ripristinati",
  postsMoved: "post spostati",
  confirmBulkDelete: "Eliminare {count} post definitivamente?",
  deleteColumnConfirm: "Eliminare questa colonna? I post saranno spostati in 'Senza colonna'.",
  columnCreateError: "Errore nella creazione della colonna",
  clientCanEditCaption: "Il cliente può modificare la didascalia",
  clientCannotEditCaption: "Il cliente non può modificare la didascalia",
  clientCanCreatePosts: "Il cliente può creare post",
  clientCannotCreatePosts: "Il cliente non può creare post",
  trackingActive: "Monitoraggio attivo",
  trackingCreated: "Monitoraggio creato!",
  trackingCreatedDesc: "La colonna di monitoraggio è stata aggiunta alla bacheca.",
  syncWithTrello: "Sincronizza con Trello",
  trelloBoardId: "Board ID di Trello",
  trelloBoardIdPlaceholder: "Es: abc123def456",
  trelloBoardIdHelp: "Trova il Board ID nell'URL di Trello: trello.com/b/BOARD_ID/nome-board",
  trelloSyncWarning: "⚠️ La sincronizzazione sostituirà tutte le colonne e i post esistenti di questo cliente.",
  syncing: "Sincronizzando...",
  startSync: "Avvia Sincronizzazione",
  syncComplete: "Sincronizzazione completata!",
  syncError: "Errore di sincronizzazione",
  postSentSuccess: "✅ Post inviato con successo!",
  postSentDesc: "Il tuo post è stato ricevuto ed è in attesa di revisione.",
  teamManagement: "Gestione Team",
  manageTeamMembers: "Gestisci i membri del team e le assegnazioni",
  newMember: "Nuovo Membro",
  noTeamMembers: "Nessun membro del team",
  createFirstMember: "Crea il primo membro per iniziare",
  createMember: "Crea Membro",
  fullName: "Nome Completo",
  fullNamePlaceholder: "Es: Mario Rossi",
  assignClients: "Assegna Clienti",
  assignClientsTo: "Assegna clienti a",
  noClientsAssigned: "Nessun cliente assegnato",
  teamMemberCreated: "Membro del team creato!",
  assignmentsUpdated: "Assegnazioni aggiornate!",
  confirmDeleteMember: "Sei sicuro di voler rimuovere questo membro?",
  memberDeleted: "Membro rimosso!",
  team: "Team",
  hello: "Ciao",
  teamMember: "Membro del team",
  yourClients: "I tuoi clienti",
  myClients: "I Miei Clienti",
  contactAdmin: "Contatta l'amministratore per l'assegnazione dei clienti",
  notifications: "Notifiche",
  adminFeedback: "Feedback Admin",
  statusUpdated: "Stato aggiornato!",
  myProfile: "Il Mio Profilo",
  editProfileDesc: "Modifica il tuo nome e la foto",
  profileUpdated: "Profilo aggiornato!",
  changePasswordDesc: "Imposta una nuova password",
  error: "Errore",
  inviteMember: "Invita Membro",
  inviteMemberDesc: "Invita qualcuno come membro del team o amministratore",
  roleLabel: "Tipo di accesso",
  sendInvite: "Invia Invito",
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
  statusChangeRequested: "Cambio Solicitado",
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
  selectOrCreateClient: "Selecciona o crea un cliente",
  postsForToday: "Posts para Hoy",
  clientFeedbacks: "Feedbacks de Clientes",
  restoredByClient: "Posts Restaurados por el Cliente",
  restored: "Restaurado",
  postsCreatedByClient: "Posts Creados por el Cliente",
  createdByClient: "Creado por el cliente",
  noClientsYet: "Sin clientes aún",
  createFirstClient: "Crea tu primer cliente para comenzar",
  createClient: "Crear Cliente",
  manage: "Gestionar",
  editClient: "Editar Cliente",
  newClient: "Nuevo Cliente",
  clientName: "Nombre del Cliente",
  clientNamePlaceholder: "Ej: Empresa XYZ",
  slugUrl: "Slug (URL)",
  clientLanguage: "Idioma del Cliente",
  logo: "Logo",
  selectLogo: "Seleccionar logo",
  change: "Cambiar",
  save: "Guardar",
  password: "Contraseña",
  changePassword: "Cambiar Contraseña",
  newPassword: "Nueva contraseña",
  confirmNewPassword: "Confirmar nueva contraseña",
  minChars: "Mínimo 6 caracteres",
  repeatPassword: "Repite la contraseña",
  saving: "Guardando...",
  saveNewPassword: "Guardar nueva contraseña",
  passwordUpdated: "¡Contraseña actualizada con éxito!",
  passwordMinError: "La contraseña debe tener al menos 6 caracteres",
  passwordMismatch: "Las contraseñas no coinciden",
  passwordUpdateError: "Error al actualizar la contraseña",
  invite: "Invitar",
  inviteAdmin: "Invitar Administrador",
  invitations: "Invitaciones",
  accepted: "Aceptado",
  expired: "Expirado",
  pending: "Pendiente",
  linkCopied: "¡Enlace copiado!",
  inviteCreated: "¡Invitación creada!",
  inviteError: "Error al enviar invitación",
  social: "Social",
  signOut: "Salir",
  confirmDeleteClient: "¿Estás seguro de que quieres eliminar este cliente?",
  noColumn: "Sin columna",
  columnLabel: "Columna",
  columnName: "Nombre de columna",
  cancel: "Cancelar",
  newColumn: "Nueva columna",
  addPost: "Agregar publicación",
  visibleToClient: "Visible para el cliente",
  hiddenFromClient: "Oculto al cliente",
  board: "Tablero",
  archived: "Archivados",
  noArchivedPosts: "Sin publicaciones archivadas",
  archivedPostsAppearHere: "Las publicaciones con estado \"Finalizado\" aparecerán aquí",
  restore: "Restaurar",
  deletePermanently: "¿Eliminar permanentemente?",
  select: "Seleccionar",
  createTracking: "Crear Seguimiento",
  trelloSync: "Trello Sync",
  clickToSetPeriod: "Haz clic para definir el período",
  selected: "seleccionados",
  changeStatus: "Cambiar estado",
  moveToColumn: "Mover a columna",
  archive: "Archivar",
  deleteAction: "Eliminar",
  postsUpdated: "publicaciones actualizadas",
  postsDeleted: "publicaciones eliminadas",
  postsRestored: "publicaciones restauradas",
  postsMoved: "publicaciones movidas",
  confirmBulkDelete: "¿Eliminar {count} publicaciones permanentemente?",
  deleteColumnConfirm: "¿Eliminar esta columna? Las publicaciones se moverán a 'Sin columna'.",
  columnCreateError: "Error al crear columna",
  clientCanEditCaption: "El cliente puede editar leyenda",
  clientCannotEditCaption: "El cliente no puede editar leyenda",
  clientCanCreatePosts: "El cliente puede crear publicaciones",
  clientCannotCreatePosts: "El cliente no puede crear publicaciones",
  trackingActive: "Seguimiento activo",
  trackingCreated: "¡Seguimiento creado!",
  trackingCreatedDesc: "La columna de seguimiento fue añadida al tablero.",
  syncWithTrello: "Sincronizar con Trello",
  trelloBoardId: "Board ID de Trello",
  trelloBoardIdPlaceholder: "Ej: abc123def456",
  trelloBoardIdHelp: "Encuentra el Board ID en la URL de Trello: trello.com/b/BOARD_ID/nombre-del-board",
  trelloSyncWarning: "⚠️ La sincronización reemplazará todas las columnas y publicaciones existentes de este cliente.",
  syncing: "Sincronizando...",
  startSync: "Iniciar Sincronización",
  syncComplete: "¡Sincronización completada!",
  syncError: "Error de sincronización",
  postSentSuccess: "✅ ¡Publicación enviada con éxito!",
  postSentDesc: "Tu publicación fue recibida y está en espera de revisión.",
  teamManagement: "Gestión del Equipo",
  manageTeamMembers: "Gestiona los miembros del equipo y asignaciones",
  newMember: "Nuevo Miembro",
  noTeamMembers: "Sin miembros del equipo",
  createFirstMember: "Crea el primer miembro para comenzar",
  createMember: "Crear Miembro",
  fullName: "Nombre Completo",
  fullNamePlaceholder: "Ej: Juan García",
  assignClients: "Asignar Clientes",
  assignClientsTo: "Asignar clientes a",
  noClientsAssigned: "Sin clientes asignados",
  teamMemberCreated: "¡Miembro del equipo creado!",
  assignmentsUpdated: "¡Asignaciones actualizadas!",
  confirmDeleteMember: "¿Estás seguro de que quieres eliminar este miembro?",
  memberDeleted: "¡Miembro eliminado!",
  team: "Equipo",
  hello: "Hola",
  teamMember: "Miembro del equipo",
  yourClients: "Tus clientes",
  myClients: "Mis Clientes",
  contactAdmin: "Contacta al administrador para la asignación de clientes",
  notifications: "Notificaciones",
  adminFeedback: "Feedback del Admin",
  statusUpdated: "¡Estado actualizado!",
  myProfile: "Mi Perfil",
  editProfileDesc: "Edita tu nombre y foto",
  profileUpdated: "¡Perfil actualizado!",
  changePasswordDesc: "Establece una nueva contraseña",
  error: "Error",
  inviteMember: "Invitar Miembro",
  inviteMemberDesc: "Invita a alguien como miembro del equipo o administrador",
  roleLabel: "Tipo de acceso",
  sendInvite: "Enviar Invitación",
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
  statusChangeRequested: "Ändring Begärd",
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
  tagChangeRequested: "Ändring Begärd",
  media: "Media",
  clickToSelectMedia: "Klicka för att välja bild eller video",
  postingPeriod: "Publiceringsperiod",
  editPeriodPlaceholder: "T.ex.: Mars 2026",
  readMore: "Läs mer",
  readLess: "Läs mindre",
  publishForecast: "Publiceringsförhandsvisning",
  selectOrCreateClient: "Välj eller skapa en klient",
  postsForToday: "Inlägg för Idag",
  clientFeedbacks: "Kundfeedback",
  restoredByClient: "Inlägg Återställda av Klient",
  restored: "Återställd",
  postsCreatedByClient: "Inlägg Skapade av Klient",
  createdByClient: "Skapad av klient",
  noClientsYet: "Inga klienter ännu",
  createFirstClient: "Skapa din första klient för att komma igång",
  createClient: "Skapa Klient",
  manage: "Hantera",
  editClient: "Redigera Klient",
  newClient: "Ny Klient",
  clientName: "Klientnamn",
  clientNamePlaceholder: "T.ex.: Företag XYZ",
  slugUrl: "Slug (URL)",
  clientLanguage: "Klientens Språk",
  logo: "Logo",
  selectLogo: "Välj logo",
  change: "Ändra",
  save: "Spara",
  password: "Lösenord",
  changePassword: "Ändra Lösenord",
  newPassword: "Nytt lösenord",
  confirmNewPassword: "Bekräfta nytt lösenord",
  minChars: "Minst 6 tecken",
  repeatPassword: "Upprepa lösenordet",
  saving: "Sparar...",
  saveNewPassword: "Spara nytt lösenord",
  passwordUpdated: "Lösenord uppdaterat!",
  passwordMinError: "Lösenordet måste vara minst 6 tecken",
  passwordMismatch: "Lösenorden matchar inte",
  passwordUpdateError: "Fel vid uppdatering av lösenord",
  invite: "Bjud in",
  inviteAdmin: "Bjud in Administratör",
  invitations: "Inbjudningar",
  accepted: "Accepterad",
  expired: "Utgången",
  pending: "Väntande",
  linkCopied: "Länk kopierad!",
  inviteCreated: "Inbjudan skapad!",
  inviteError: "Fel vid skickande av inbjudan",
  social: "Social",
  signOut: "Logga ut",
  confirmDeleteClient: "Är du säker på att du vill ta bort denna klient?",
  noColumn: "Ingen kolumn",
  columnLabel: "Kolumn",
  columnName: "Kolumnnamn",
  cancel: "Avbryt",
  newColumn: "Ny kolumn",
  addPost: "Lägg till inlägg",
  visibleToClient: "Synlig för klient",
  hiddenFromClient: "Dold för klient",
  board: "Tavla",
  archived: "Arkiverade",
  noArchivedPosts: "Inga arkiverade inlägg",
  archivedPostsAppearHere: "Inlägg med status \"Avslutat\" visas här",
  restore: "Återställ",
  deletePermanently: "Ta bort permanent?",
  select: "Välj",
  createTracking: "Skapa Spårning",
  trelloSync: "Trello Sync",
  clickToSetPeriod: "Klicka för att ställa in perioden",
  selected: "valda",
  changeStatus: "Ändra status",
  moveToColumn: "Flytta till kolumn",
  archive: "Arkivera",
  deleteAction: "Ta bort",
  postsUpdated: "inlägg uppdaterade",
  postsDeleted: "inlägg borttagna",
  postsRestored: "inlägg återställda",
  postsMoved: "inlägg flyttade",
  confirmBulkDelete: "Ta bort {count} inlägg permanent?",
  deleteColumnConfirm: "Ta bort denna kolumn? Inlägg flyttas till 'Ingen kolumn'.",
  columnCreateError: "Fel vid skapande av kolumn",
  clientCanEditCaption: "Klient kan redigera bildtext",
  clientCannotEditCaption: "Klient kan inte redigera bildtext",
  clientCanCreatePosts: "Klient kan skapa inlägg",
  clientCannotCreatePosts: "Klient kan inte skapa inlägg",
  trackingActive: "Spårning aktiv",
  trackingCreated: "Spårning skapad!",
  trackingCreatedDesc: "Spårningskolumnen lades till på tavlan.",
  syncWithTrello: "Synkronisera med Trello",
  trelloBoardId: "Trello Board ID",
  trelloBoardIdPlaceholder: "T.ex.: abc123def456",
  trelloBoardIdHelp: "Hitta Board ID i Trello-URL:en: trello.com/b/BOARD_ID/board-namn",
  trelloSyncWarning: "⚠️ Synkronisering ersätter alla befintliga kolumner och inlägg för denna klient.",
  syncing: "Synkroniserar...",
  startSync: "Starta Synkronisering",
  syncComplete: "Synkronisering klar!",
  syncError: "Synkroniseringsfel",
  postSentSuccess: "✅ Inlägg skickat!",
  postSentDesc: "Ditt inlägg har mottagits och väntar på granskning.",
  teamManagement: "Teamhantering",
  manageTeamMembers: "Hantera teammedlemmar och tilldelningar",
  newMember: "Ny Medlem",
  noTeamMembers: "Inga teammedlemmar",
  createFirstMember: "Skapa den första medlemmen för att komma igång",
  createMember: "Skapa Medlem",
  fullName: "Fullständigt Namn",
  fullNamePlaceholder: "T.ex.: Erik Svensson",
  assignClients: "Tilldela Klienter",
  assignClientsTo: "Tilldela klienter till",
  noClientsAssigned: "Inga klienter tilldelade",
  teamMemberCreated: "Teammedlem skapad!",
  assignmentsUpdated: "Tilldelningar uppdaterade!",
  confirmDeleteMember: "Är du säker på att du vill ta bort denna medlem?",
  memberDeleted: "Medlem borttagen!",
  team: "Team",
  hello: "Hej",
  teamMember: "Teammedlem",
  yourClients: "Dina klienter",
  myClients: "Mina Klienter",
  contactAdmin: "Kontakta administratören för klienttilldelning",
  notifications: "Aviseringar",
  adminFeedback: "Admin Feedback",
  statusUpdated: "Status uppdaterad!",
  myProfile: "Min Profil",
  editProfileDesc: "Redigera ditt namn och foto",
  profileUpdated: "Profil uppdaterad!",
  changePasswordDesc: "Ange ett nytt lösenord",
  error: "Fel",
  inviteMember: "Bjud in Medlem",
  inviteMemberDesc: "Bjud in någon som teammedlem eller administratör",
  roleLabel: "Åtkomsttyp",
  sendInvite: "Skicka Inbjudan",
};

export const translations: Record<Locale, TranslationKeys> = { pt, en, it, es, sv };
