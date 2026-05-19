
-- POSTS: filtered by client_id everywhere, often combined with archived, column_id, deadline, client_label
CREATE INDEX IF NOT EXISTS idx_posts_client_id ON public.posts(client_id);
CREATE INDEX IF NOT EXISTS idx_posts_client_archived ON public.posts(client_id, archived);
CREATE INDEX IF NOT EXISTS idx_posts_client_archived_position ON public.posts(client_id, archived, position) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_posts_column_id ON public.posts(column_id);
CREATE INDEX IF NOT EXISTS idx_posts_deadline ON public.posts(deadline) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_posts_client_label ON public.posts(client_id, client_label) WHERE archived = false AND client_label <> 'pendente';
CREATE INDEX IF NOT EXISTS idx_posts_client_unarchived_at ON public.posts(client_id, client_unarchived_at) WHERE client_unarchived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_client_created_at_notif ON public.posts(client_id, client_created_at) WHERE client_created_at IS NOT NULL;

-- COMMENTS: always queried by post_id
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);

-- TAGS / COLUMNS by client
CREATE INDEX IF NOT EXISTS idx_tags_client_id ON public.tags(client_id);
CREATE INDEX IF NOT EXISTS idx_columns_client_id ON public.columns(client_id, position);

-- CLIENTS: ownership / shared filters
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_shared ON public.clients(shared) WHERE shared = true;

-- USER ASSIGNMENTS / ROLES
CREATE INDEX IF NOT EXISTS idx_uca_user_id ON public.user_client_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_uca_client_id ON public.user_client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ADMIN NOTIFICATIONS: hot path for bell + dashboards
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_read ON public.admin_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_client_read ON public.admin_notifications(client_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(type);

-- CALENDAR / SOCIAL
CREATE INDEX IF NOT EXISTS idx_calendar_posts_client_date ON public.calendar_posts(client_id, publish_date);
CREATE INDEX IF NOT EXISTS idx_social_posts_client ON public.social_posts(client_id);

-- APPOINTMENTS
CREATE INDEX IF NOT EXISTS idx_appointments_user_date ON public.appointments(user_id, appointment_date);

-- CLIENT NOTES
CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON public.client_notes(client_id);

-- BRIEFS
CREATE INDEX IF NOT EXISTS idx_content_briefs_client_id ON public.content_briefs(client_id);
CREATE INDEX IF NOT EXISTS idx_design_briefs_user_id ON public.design_briefs(user_id);
CREATE INDEX IF NOT EXISTS idx_design_briefs_client_id ON public.design_briefs(client_id);
CREATE INDEX IF NOT EXISTS idx_brief_templates_user_id ON public.brief_templates(user_id);

-- APPROVALS
CREATE INDEX IF NOT EXISTS idx_approval_tokens_client_active ON public.approval_tokens(client_id, active);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_post_id ON public.approval_tokens(post_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_post_id ON public.approval_actions(post_id);
CREATE INDEX IF NOT EXISTS idx_approval_actions_token_id ON public.approval_actions(token_id);

-- INVOICES
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);

-- HASHTAG GROUPS
CREATE INDEX IF NOT EXISTS idx_hashtag_groups_client_id ON public.hashtag_groups(client_id);

-- INTERNAL APPROVALS
CREATE INDEX IF NOT EXISTS idx_internal_approvals_assigned_to ON public.internal_approvals(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_internal_approvals_post_id ON public.internal_approvals(post_id);

-- BRIEF responses/comments/attachments
CREATE INDEX IF NOT EXISTS idx_brief_comments_brief_id ON public.brief_comments(brief_id);
CREATE INDEX IF NOT EXISTS idx_brief_attachments_brief_id ON public.brief_attachments(brief_id);

-- IDEAS
CREATE INDEX IF NOT EXISTS idx_ideas_user_column ON public.ideas(user_id, column_id, position);
CREATE INDEX IF NOT EXISTS idx_idea_columns_user_id ON public.idea_columns(user_id, position);

-- CONTRACTS
CREATE INDEX IF NOT EXISTS idx_contracts_client_status ON public.contracts(client_id, status);
CREATE INDEX IF NOT EXISTS idx_contract_acceptances_user_id ON public.contract_acceptances(user_id);
