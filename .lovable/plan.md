

# Ações em Lote (Bulk Actions) nos Cards

## O que será feito
Adicionar um modo de seleção múltipla no Kanban e na lista, permitindo selecionar vários cards e aplicar ações em lote: **mudar status**, **arquivar (finalizar)**, **excluir** e **mover para coluna**.

## Alterações

### 1. Estado de seleção (`AdminPage.tsx`)
- Novo estado `selectedPostIds: Set<string>` e `selectionMode: boolean`
- Botão "Selecionar" no header que ativa/desativa o modo de seleção
- Quando ativo, aparece uma **barra de ações flutuante** na parte inferior com:
  - Contador: "X selecionados"
  - Dropdown "Mudar status" (aplica status a todos os selecionados)
  - Botão "Arquivar" (finaliza todos os selecionados)
  - Botão "Excluir" (com confirmação)
  - Botão "Cancelar seleção"

### 2. Checkbox nos cards (`PostCard.tsx` / `DraggablePostCard`)
- Quando `selectionMode` está ativo, mostrar um checkbox no canto superior esquerdo de cada card
- Clicar no card alterna seleção (em vez de abrir edição)
- Visual: borda destacada nos cards selecionados

### 3. Ações em lote (`PostsContext.tsx`)
- Nova função `bulkUpdateStatus(ids: string[], status: PostStatus)` — faz update em batch no banco
- Nova função `bulkDeletePosts(ids: string[])` — deleta em batch
- Reutiliza a lógica existente de arquivamento automático quando status = "finalizado"

### 4. Aba Arquivados — mesma lógica
- Checkboxes nos cards arquivados para restaurar ou excluir em lote

## Fluxo do usuário
1. Clica "Selecionar" no header → modo de seleção ativado
2. Clica nos cards desejados (checkbox aparece, borda muda)
3. Na barra flutuante inferior, escolhe a ação
4. Ação aplicada a todos os selecionados → seleção limpa

