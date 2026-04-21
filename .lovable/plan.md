

# Plano: Faturas Profissionais com Emissor + Cliente + Logo

## Objetivo
Transformar o PDF da fatura em um documento profissional completo, com dados do emissor (você), dados expandidos do cliente, métodos de pagamento e logo do cliente — tudo no estilo Apple minimalista.

## 1. Banco de Dados

### Configurações globais do emissor (você)
Reaproveitar a tabela existente `app_settings` (key/value) para salvar os dados do negócio como JSON sob a chave `issuer_details`:
- `business_name`, `address`, `country`, `email`, `tax_id`, `payment_method`, `payment_details`

Sem necessidade de nova tabela — `app_settings` já existe e é editável por admins.

### Expandir tabela `clients` (migração)
Adicionar colunas opcionais:
- `address` (text, default '')
- `country` (text, default '')
- `tax_id` (text, default '')

Não quebra nada: todos com default vazio.

## 2. UI — Configurações do Emissor

Nova aba/seção **"Dados da Empresa"** dentro de `BillingPage.tsx` (ou no menu admin), com formulário:
- Nome do negócio, endereço, país, e-mail, Tax ID/VAT
- Forma de pagamento padrão (ex: "Transferência Bancária")
- Detalhes de pagamento (IBAN, PayPal, PIX, etc.)
- Botão "Salvar" → grava em `app_settings`

Hook novo: `useIssuerDetails()` para ler/salvar.

## 3. UI — Dados Expandidos do Cliente

Em `ClientBillingConfig.tsx` (ou no editor do cliente), adicionar campos opcionais:
- Endereço, País, Tax ID/VAT

## 4. UI — Editor de Fatura (`InvoiceDetailDialog.tsx`)

Adicionar campos editáveis por fatura (sobrescrevem padrões se preenchidos):
- Forma de pagamento (input)
- Detalhes de pagamento (textarea)
- Notas/observações já existem (`notes`)

Migração extra na tabela `invoices`:
- `payment_method` (text, default '')
- `payment_details` (text, default '')

## 5. PDF — Novo Layout (`src/lib/invoicePdf.ts`)

```text
┌─────────────────────────────────────────────┐
│  [LOGO CLIENTE]              FATURA #001    │
│                              Status: Paga   │
├─────────────────────────────────────────────┤
│  DE (Emissor)          PARA (Cliente)       │
│  Liege Studio          Nome do Cliente      │
│  Endereço              Endereço             │
│  País                  País                  │
│  email@...             Tax ID                │
│  VAT: ...                                   │
├─────────────────────────────────────────────┤
│  Emissão: ...    Vencimento: ...            │
├─────────────────────────────────────────────┤
│  [TABELA DE ITENS — mantida igual]          │
├─────────────────────────────────────────────┤
│  Subtotal / Desconto / Total                │
├─────────────────────────────────────────────┤
│  PAGAMENTO                                  │
│  Método: Transferência                      │
│  IBAN: IT00...                              │
├─────────────────────────────────────────────┤
│  Observações: ...                           │
├─────────────────────────────────────────────┤
│  www.liegestudio.com                        │
└─────────────────────────────────────────────┘
```

- Logo do cliente: usar `invoice.clients.logo_url` (já existe no schema), exibido no canto superior esquerdo (max 80px altura).
- `generateInvoicePDF` recebe novos parâmetros: `issuer` (do `app_settings`) e usa dados expandidos do cliente.
- Estilo Apple: tipografia limpa, espaçamento generoso, divisores sutis, sem cores chamativas.

## 6. Fluxo Geral

1. Admin abre **Faturamento → Dados da Empresa**, preenche uma vez.
2. Admin edita cliente → preenche endereço/Tax ID (opcional).
3. Ao gerar PDF, o sistema carrega:
   - `app_settings` → emissor
   - `invoice.clients` → cliente expandido + logo
   - `invoice.payment_method/details` (sobrescreve padrão se houver)
4. PDF renderiza tudo no novo layout.

## Arquivos a alterar/criar

**Migrações:**
- Adicionar colunas em `clients` (address, country, tax_id)
- Adicionar colunas em `invoices` (payment_method, payment_details)

**Código novo:**
- `src/hooks/useIssuerDetails.ts` — ler/salvar dados do emissor
- `src/components/billing/IssuerSettingsPanel.tsx` — formulário de configuração

**Código alterado:**
- `src/lib/invoicePdf.ts` — novo layout completo com logo + emissor + cliente expandido + pagamento
- `src/components/billing/InvoiceDetailDialog.tsx` — campos payment_method/details, passar issuer ao gerar PDF
- `src/components/billing/ClientBillingConfig.tsx` — campos de endereço/Tax ID do cliente
- `src/pages/BillingPage.tsx` — aba/botão para abrir configurações do emissor
- `src/hooks/useInvoices.ts` — incluir novos campos no tipo `Invoice`

## Garantias
- Nenhum campo existente removido.
- Todos os novos campos opcionais com default vazio → faturas antigas continuam funcionando.
- Funcionalidade atual (criar/editar/baixar/enviar ao cliente) intacta.

