

## Visualização rica do CSV em gráficos bonitos

Vou transformar o painel de upload + dashboard de relatórios numa experiência visual completa: depois do upload, além dos cards de totais que já existem, o sistema vai exibir **todos os dados linha-a-linha do CSV** em vários gráficos elegantes (não só os 7 agregados), com um "pretty print" da tabela bruta para o usuário inspecionar.

### O que será adicionado

**1. Tabela "pretty print" do CSV** (colapsável)
- Mostra as primeiras 50 linhas do CSV como uma tabela glassmorphism rolável
- Cabeçalhos sticky, números alinhados à direita com formatação pt-BR
- Badge com total de linhas + colunas detectadas
- Botão "Ver todas as linhas" para expandir

**2. Novo componente `CsvDataCharts.tsx`** — gera múltiplos gráficos a partir das linhas brutas do CSV:

   - **Linha temporal** (Area chart): se houver coluna de Data, plota Alcance/Impressões/Investimento ao longo do tempo
   - **Top 10 linhas por métrica** (Bar chart horizontal): ranking das linhas com maior Alcance, maior Investimento, maior Engajamento
   - **Mix de Investimento × Resultado** (Scatter chart): correlação Spend × Reach — cada ponto é uma linha do CSV, ajuda a ver custo-benefício
   - **Distribuição por categoria** (Donut): se houver coluna textual repetitiva (ex: "Tipo de post", "Campanha", "Descrição"), agrupa e soma a métrica principal
   - **Comparativo de métricas** (Radar): visão consolidada normalizada das 7 métricas

   Cada gráfico só aparece se houver dados suficientes — sem espaços vazios.

**3. Cards de totais existentes** ganham:
   - Mini-sparkline (mostra a evolução ao longo das linhas do CSV)
   - Variação % vs período anterior, se houver
   - Já permanecem com Alcance / Impressões / Investimento

**4. Fluxo atualizado em `CsvUploadPanel.tsx`**:
   - Continua: Upload → Confirmar mapeamento → Aplicar
   - Passa para o `CreateReportPage` não só os totais agregados, mas também as **linhas brutas + headers** via callback estendido
   - Adiciona auto-detecção de coluna de Data (palavras-chave: "data", "date", "dia", "início", "fim")

**5. Em `CreateReportPage.tsx`**:
   - Renderiza, abaixo dos cards: Tabela pretty print → Gráficos do CSV (`CsvDataCharts`) → Gráficos agregados existentes (`ReportCharts`)
   - Tudo dentro do estilo glassmorphism dark já estabelecido no projeto

### Detalhes técnicos

- **Sem nova dependência**: já existe `recharts` no projeto (visto em `ReportCharts.tsx`); usarei `LineChart`, `ScatterChart`, `BarChart` horizontal e `RadarChart` dele.
- **Cores**: reutilizo a paleta `CHART_COLORS` definida em `ReportCharts.tsx` para manter consistência.
- **Detecção de coluna de data**: regex em `stripDiacritics(header)` + tentativa de parsear cada célula como `Date`.
- **Detecção de coluna de categoria**: heurística — coluna textual com 2 ≤ valores únicos ≤ 15 e que não seja a coluna de data.
- **Performance**: limita gráficos a 50 pontos no scatter (sample) e top 10 no ranking. Tabela pretty print usa `useMemo` para slicing.
- **Estado adicional em `CreateReportPage`**: `csvRawRows` e `csvHeaders` para alimentar `CsvDataCharts` e a tabela.
- **Interface do callback** `onMetricsParsed` ganha campos opcionais `rawRows` e `rawHeaders` — retrocompatível.

### Arquivos

- **Editar** `src/components/reports/CsvUploadPanel.tsx` — passar linhas brutas + headers + coluna de data detectada via callback
- **Criar** `src/components/reports/CsvDataCharts.tsx` — novo componente com 5 gráficos visuais
- **Criar** `src/components/reports/CsvDataTable.tsx` — pretty print colapsável das primeiras 50 linhas
- **Editar** `src/pages/CreateReportPage.tsx` — integrar tabela + novos gráficos abaixo dos cards de totais
- **Editar** `src/components/reports/ReportCharts.tsx` — adicionar mini-sparklines opcionais aos cards (apenas pequena melhoria visual)

### O que NÃO muda

- Lógica de mapeamento manual (dropdowns) e detecção das 7 métricas continua igual
- Cards de total (Alcance / Impressões / Investimento) permanecem visíveis como antes
- Estética glassmorphism dark já definida nas memórias do projeto
- Salvamento no banco continua igual — os gráficos adicionais são apenas visualização local pré-publicação

