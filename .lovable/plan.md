

## Expandir o editor de templates de Brief (estilo Google Forms)

Vou turbinar o `TemplateEditor.tsx` que já existe para ficar parecido com Google Forms, com mais tipos de campo, configurações por pergunta, seções e pré-visualização.

### Novos tipos de pergunta

Hoje já temos: texto curto, texto longo, sim/não, escolha única, múltipla escolha, upload, link.

Vou adicionar:
- **Dropdown** (select) — lista suspensa com opções
- **Escala linear** (1 a 5, 1 a 10) — com rótulos nas pontas (ex: "Ruim" → "Ótimo")
- **Data** — date picker
- **Hora** — time picker
- **Número** — input numérico com min/max opcional
- **Email** — com validação
- **Grade de múltipla escolha** — linhas × colunas (ex: avaliar vários itens)
- **Seção/Quebra** — divisor com título e descrição (organiza o formulário em blocos)

### Configurações por pergunta (painel expandido)

Cada pergunta vai ter um card expansível com:
- Texto da pergunta
- Texto de ajuda/descrição (subtítulo opcional)
- Tipo de campo (dropdown com ícones)
- Obrigatória (switch)
- Opções dinâmicas (adicionar/remover/reordenar uma a uma, em vez de lista separada por vírgula)
- "Outro" como opção (para escolha única / múltipla / dropdown)
- Placeholder (para campos de texto)
- Limites (min/max para número e escala)

### UX do editor

- **Drag & drop** real entre perguntas (substituir setas ↑↓ por @dnd-kit que já está no projeto)
- **Duplicar pergunta** (botão de cópia ao lado de excluir)
- **Aba "Pré-visualizar"** dentro do editor — mostra como o cliente verá o formulário, sem salvar nada
- **Contador de perguntas obrigatórias** no rodapé
- **Auto-save indicator** (apenas visual; salvamento continua manual via botão)

### Renderização no formulário do cliente

Atualizar `FillBriefDialog.tsx` para suportar todos os novos tipos:
- Dropdown → `<Select>`
- Escala → botões 1..N com rótulos
- Data/hora → componentes existentes (`Calendar`, input time)
- Número/email → input com validação
- Grade → tabela de radios
- Seção → renderiza título grande + descrição, sem campo de resposta

### Arquivos a alterar

- `src/hooks/useBriefTemplates.ts` — expandir o tipo `FieldType` e `BriefQuestion` (adicionar `helpText`, `placeholder`, `min`, `max`, `scaleLabels`, `gridRows`, `gridCols`, `allowOther`)
- `src/components/briefs/TemplateEditor.tsx` — reescrever painel de pergunta com card expansível, drag & drop, opções dinâmicas, aba de preview
- `src/components/briefs/FillBriefDialog.tsx` — adicionar renderização para os novos tipos
- (sem mudanças de schema — o campo `questions` já é JSONB e aceita qualquer estrutura)

### Não vou mexer

- Visual geral / glassmorphism / cores
- Tabelas do banco (a estrutura JSONB atual já comporta tudo)
- Fluxo de envio/resposta/reabertura

