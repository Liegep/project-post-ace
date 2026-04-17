

## Identificação de tags importadas do Trello

**Sim, é possível identificar.** O padrão é claro pelo formato do `id`:

- **Tags do Trello**: `id` é uma string hexadecimal de 24 caracteres (formato MongoDB ObjectId), ex: `66b9ddf3697a512f28eec2e1`. Isso é confirmado em `supabase/functions/trello-sync/index.ts`, que faz `upsert` usando o `label.id` original do Trello.
- **Tags criadas no app**: `id` é UUID v4 padrão (com hífens), ex: `71f42fcf-7b93-4b86-981a-56318922f9c4`, gerado por `gen_random_uuid()`.
- **Tags semente legadas**: slugs simples sem `client_id` (ex: `seo`, `agendado`, `publicado`).

### Resumo do que existe hoje

| Origem | Quantidade | Exemplos |
|---|---|---|
| Trello (hex 24 chars) | 9 | `✅ Pauta Aprovada`, `🤚 Alterar`, `Onde você quer morar` (cliente Marcia/51de8960) |
| App (UUID) | 24 | `APROVADO PELA BOSS ❤️`, `AGENDAR PARA 07/04`, `TAG CRIADA PELO CLIENTE` (cliente Aplikasi/6ef3d8b4) |
| Sementes legadas | 5 | `seo`, `agendado`, `publicado`, `alterado`, `alteracao_solicitada` |

### Plano de implementação

Adicionar um indicador visual e filtro no painel administrativo de tags:

1. **Helper `getTagOrigin(id)`** em `src/lib/utils.ts`:
   - `/^[a-f0-9]{24}$/i` → `"trello"`
   - `/^[0-9a-f-]{36}$/i` → `"app"`
   - caso contrário → `"legacy"`

2. **Badge de origem** no `TagSelector` / gerenciador de tags:
   - Trello → badge azul "Trello"
   - App → sem badge (padrão)
   - Legacy → badge cinza "Sistema"

3. **Filtro opcional** no popover de tags ("Mostrar apenas: Todas / App / Trello").

4. **Relatório rápido** (opcional): seção em `/admin` mostrando contagem por origem por cliente.

### Observação

O cliente **Marcia Bessa** (`51de8960...`) é o único com tags importadas do Trello — todas as 9 tags hex pertencem a ele. Os demais clientes (Aplikasi, etc.) têm apenas tags criadas no app.

