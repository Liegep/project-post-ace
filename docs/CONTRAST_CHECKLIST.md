# Contrast & Legibility Checklist — Text Content Dialogs

Use este checklist sempre que mexer em `CreateTextContentDialog.tsx`,
`TextContentDetailDialog.tsx` ou qualquer modal com fundo claro/glass.

## Regras de ouro

1. **Nunca confiar em herança de cor** dentro de `DialogContent` com
   `!bg-white` — sempre forçar `!text-black` (ou `text-foreground` quando
   o container usar `bg-card`).
2. Toda área de texto longo (article, comentários, observações) precisa de
   contraste AA: preto sobre branco/claro **ou** `text-foreground` sobre
   `bg-background/bg-card`.
3. Subtítulos / textos secundários: usar `!text-black/70` (não
   `text-black/70` puro — pode ser sobrescrito por `[&_*]` da prose).
4. Links dentro de `prose`: forçar `[&_a]:!text-blue-600` (claro) ou
   `[&_a]:!text-primary` (tema).
5. Textareas e inputs dentro de modais glass: `bg-white text-black` ou
   `bg-background text-foreground` — nunca herdar transparente.
6. Badges de status: garantir que `color` e `bg` venham juntos do mesmo
   token (`bg-warning/15 text-warning`), nunca só um lado.

## Estados a validar visualmente

Para cada diálogo, abrir nos seguintes estados e verificar legibilidade:

- [ ] Vazio (sem título, sem corpo)
- [ ] Apenas título
- [ ] Título + subtítulo
- [ ] Corpo curto (1 parágrafo)
- [ ] Corpo longo com links, listas, headings, imagens
- [ ] Com PDF anexado (`pdf_url` setado)
- [ ] Com observações preenchidas
- [ ] Com comentários (cliente e admin)
- [ ] Modo claro do SO
- [ ] Modo escuro do SO
- [ ] Mobile (375px) e desktop (1440px)

## Forbidden patterns

Procurar com `rg` antes de commitar:

```
rg "text-white" src/components/CreateTextContentDialog.tsx src/components/TextContentDetailDialog.tsx
rg "text-gray-[123]00" src/components/CreateTextContentDialog.tsx src/components/TextContentDetailDialog.tsx
```

Qualquer ocorrência de `text-white` dentro do preview do cliente é bug.

## Teste automatizado

`src/components/__tests__/text-content-contrast.test.ts` faz a checagem
estática dos padrões obrigatórios. Rodar com `bunx vitest run`.
