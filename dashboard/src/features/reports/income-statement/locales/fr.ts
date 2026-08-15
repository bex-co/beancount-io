export interface TranslationEntry {
  message: string;
  description: string;
}

const frIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "Hiérarchie des Dépenses",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message:
      "Suivre {ledgerName} dépenses à travers différentes devises dans le temps",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "Hiérarchie des Revenus",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message:
      "Suivre {ledgerName} revenus à travers différentes devises dans le temps",
    description: "Description for income chart",
  },
  "page.incomeStatement.netProfitDescription": {
    message:
      "Suivre {ledgerName} bénéfice net à travers différentes devises dans le temps",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message: "Aucune donnée de compte de résultat trouvée pour ce grand livre.",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "Sélectionner le mode de graphique",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "Barres Individuelles",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "Barres Empilées",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "Bénéfice net total sur la période sélectionnée",
    description: "Description for net profit summary table",
  },
};

export default frIncomeStatement;
