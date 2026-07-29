export interface TranslationEntry {
  message: string;
  description: string;
}

const caIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "Jerarquia de Despeses",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message:
      "Seguir les {ledgerName} despeses en diferents monedes al llarg del temps",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "Jerarquia d'Ingressos",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message:
      "Seguir els {ledgerName} ingressos en diferents monedes al llarg del temps",
    description: "Description for income chart",
  },
  "page.incomeStatement.monthlyNetIncome": {
    message: "Ingressos nets mensuals",
    description: "Net income calculated monthly",
  },
  "page.incomeStatement.netProfitDescription": {
    message:
      "Seguir el {ledgerName} benefici net en diferents monedes al llarg del temps",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message: "Dades no disponibles",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "Seleccionar mode de gràfic",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "Barres Individuals",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "Barres Apilades",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "Benefici net total durant el període seleccionat",
    description: "Description for net profit summary table",
  },
};

export default caIncomeStatement;
