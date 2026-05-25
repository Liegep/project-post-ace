## Brand Brain — Módulo de Memória Estratégica da Marca

Novo módulo dentro da página de cada cliente, com 8 abas e integração opcional na criação de posts.

### 1. Banco de dados (Lovable Cloud)

Uma migration única criando todas as tabelas, todas vinculadas a `client_id` com RLS seguindo o padrão atual (admin/super_admin gerencia; equipe gerencia clientes atribuídos via `get_user_client_ids`; cliente lê quando atribuído via `user_client_assignments`).

Tabelas:
- `brand_brains` — registro mestre por cliente (1:1), com campos gerais (mission, vision, summary, updated_by).
- `brand_vocabulary` — term, category, emotion, status (`approved`|`avoid`|`forbidden`), notes.
- `content_pillars` — name, objective, themes (text[]), main_emotion, suggested_frequency, notes.
- `brand_voice` — 1 linha por cliente: emotional_tone, archetype, writing_rhythm, formality_level, things_to_avoid, good_examples (text[]), bad_examples (text[]).
- `words_to_avoid` — word, reason, recommended_alternative, category.
- `approved_expressions` — expression, usage_context, emotion, notes.
- `visual_directions` — category, direction, colors (text[]), image_style, lighting, composition, things_to_avoid.
- `ai_prompt_templates` — name, template_text, variables (jsonb), created_by (para reuso).
- `generated_prompts` — opcional: histórico (client_id, pillar_id, params jsonb, output text, created_by, created_at).

Cada tabela tem `created_at`, `updated_at`, trigger `update_updated_at_column`. RLS espelhado do padrão `client_notes`/`hashtag_groups`.

### 2. UI — Página Brand Brain

Rota: aba/seção dentro de `ClientPage.tsx` (ou nova rota `/cliente/:slug/brand-brain` se mais limpo). Componente principal `BrandBrainPanel.tsx` com `Tabs` (shadcn) seguindo o estilo glassmorphism atual:

- **Overview** — resumo, contadores de cada seção, missão/visão editáveis.
- **Vocabulary** — tabela + dialog de criação, badges para status (verde/âmbar/vermelho).
- **Content Pillars** — cards com pilar, objetivo, emoção, frequência.
- **Voice** — formulário único (1 registro por cliente).
- **Avoid** — tabela "evitar → usar".
- **Expressions** — cards.
- **Visual Direction** — cards com swatches de cor.
- **AI Prompts** — gerador (selects de pilar/tipo/emoção/objetivo/formato) + textarea com prompt gerado + botão copiar (reaproveitar lógica do botão de copiar do PostDetailDialog). Geração local (string template) usando dados do Brand Brain do cliente; sem chamar IA externa nesta primeira versão.

Componentes:
- `src/components/brand-brain/BrandBrainPanel.tsx` (tabs root)
- `src/components/brand-brain/tabs/Overview.tsx`, `Vocabulary.tsx`, `Pillars.tsx`, `Voice.tsx`, `Avoid.tsx`, `Expressions.tsx`, `VisualDirection.tsx`, `AiPrompts.tsx`
- Hook: `src/hooks/useBrandBrain.ts` (fetch + mutations por cliente).
- Estados vazios elegantes em cada aba.

Estilo: tokens semânticos atuais, cards com `bg-card/glass`, badges para status, dialogs shadcn para criar/editar.

### 3. Integração com criação de posts

Em `CreatePostDialog.tsx` e `EditPostDialog.tsx`: adicionar toggle "Usar Brand Brain". Quando ativo, mostra 4 selects (pilar, tom, emoção, direção visual) carregando do Brand Brain do cliente e botão "Inserir sugestão na legenda" que injeta texto formatado no campo de caption. Sem mudar nenhuma lógica existente — apenas opcional.

### 4. Permissões

- Admin/super_admin: CRUD total via RLS.
- Colaborador (equipe): CRUD nos clientes atribuídos.
- Cliente: somente leitura (RLS `SELECT` baseado em `get_user_client_ids`).

UI esconde botões de editar/criar para `role === 'client'` via `useUserRole`.

### 5. Detalhes técnicos

- Reaproveitar `RichTextEditor` quando útil (campos longos).
- Reaproveitar padrão de toasts (`use-toast`) e dialogs.
- Nenhuma funcionalidade existente removida.
- Sem realtime nas tabelas novas (manter IO de DB sob controle, alinhado ao baseline atual).
- Nenhum cron novo, nenhuma edge function nova nesta primeira fase.

### Entregáveis

1. Migration SQL criando 9 tabelas + RLS + triggers.
2. Hook `useBrandBrain` e componentes da aba.
3. Aba "Brand Brain" adicionada à `ClientPage`.
4. Integração opcional nos dialogs de criação/edição de posts.
5. Estados vazios e validações básicas (Zod nos formulários).

Confirma para eu seguir com a migration e implementação?
