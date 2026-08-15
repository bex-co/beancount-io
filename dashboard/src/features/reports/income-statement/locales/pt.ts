export interface TranslationEntry {
  message: string;
  description: string;
}

const ptIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "Hierarquia de Despesas",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message:
      "Acompanhe {ledgerName} despesas em diferentes commodities ao longo do tempo",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "Hierarquia de Receitas",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message:
      "Acompanhe {ledgerName} renda em diferentes commodities ao longo do tempo",
    description: "Description for income chart",
  },
  "page.incomeStatement.netProfitDescription": {
    message:
      "Acompanhe {ledgerName} lucro líquido em diferentes commodities ao longo do tempo",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message:
      "Nenhum dado de demonstração de resultados encontrado para este livro-razão.",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "Selecionar modo de gráfico",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "Barras Individuais",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "Barras Empilhadas",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "Lucro líquido total no período selecionado",
    description: "Description for net profit summary table",
  },
};

export default ptIncomeStatement;
