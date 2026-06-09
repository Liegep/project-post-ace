## Objetivo

Na área do cliente, deixar visualmente óbvio que "Pauta para Aprovar" é uma **ideia/rascunho em discussão**, e não o post final pronto. O kanban de posts permanece igual.

## O que muda

Apenas o componente `src/components/ClientBriefs.tsx` (cards + seção). Nenhuma alteração de dados, regras ou backend.

### 1. Banner explicativo no topo da seção

Acima dos cards "Pautas para Aprovar", adicionar uma faixa âmbar/amarela com ícone de lâmpada:

> 💡 **Estas são ideias de conteúdo aguardando sua aprovação.** Ainda não são os posts finais — depois de aprovadas, nossa equipe irá produzir as artes e legendas.

### 2. Novo visual do card de pauta

Diferenças marcantes em relação ao card de post:

- **Badge grande "PAUTA" no topo** — barra âmbar/amarela full-width com ícone de documento + texto "PAUTA PARA APROVAÇÃO" em caixa alta, peso bold.
- **Fundo estilo rascunho** — papel pautado sutil (linhas horizontais via `background-image` CSS) em tom creme/âmbar muito claro.
- **Borda tracejada** (`border-dashed`) em vez de sólida, reforçando a ideia de "esboço".
- **Ícone de documento/lápis** ao lado do título, em vez do visual limpo de post.
- **Sem qualquer preview de imagem** (mesmo se anexada futuramente) — pauta é texto/ideia.
- Botões Aprovar/Reprovar continuam iguais (já funcionam bem).

### 3. Modal de detalhe

Aplicar a mesma identidade visual no `DialogContent`:
- Header com a mesma faixa âmbar "PAUTA PARA APROVAÇÃO".
- Fundo papel pautado no body do modal.
- Texto auxiliar pequeno: "Esta é uma ideia em discussão. O post final será criado após sua aprovação."

## Detalhes técnicos

- Arquivo único editado: `src/components/ClientBriefs.tsx`.
- Tokens: usar âmbar do design system (`amber-500/15`, `amber-600`, `amber-200`) já presente em outras partes (sticky notes amarelas).
- Padrão "papel pautado": `repeating-linear-gradient` inline ou utility no className.
- Sem mudanças em `posts`, `content_briefs`, RLS, ou em qualquer outro componente.
- Sem nova dependência.

## Fora de escopo

- Layout do kanban de posts (permanece como está).
- Lógica de aprovação/criação de post na coluna "Pauta" (já funciona).
- Permissões e RLS.
