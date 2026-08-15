export interface TranslationEntry {
  message: string;
  description: string;
}

const deIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "Ausgabenhierarchie",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message:
      "Verfolgen Sie {ledgerName} Aufwendungen über verschiedene Währungen im Zeitverlauf",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "Einkommenshierarchie",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message:
      "Verfolgen Sie {ledgerName} Erträge über verschiedene Währungen im Zeitverlauf",
    description: "Description for income chart",
  },
  "page.incomeStatement.netProfitDescription": {
    message:
      "Verfolgen Sie {ledgerName} Nettogewinn über verschiedene Währungen im Zeitverlauf",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message: "Keine GuV-Daten für dieses Hauptbuch gefunden.",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "Diagrammmodus auswählen",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "Einzelne Balken",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "Gestapelte Balken",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "Gesamtgewinn über den ausgewählten Zeitraum",
    description: "Description for net profit summary table",
  },
};

export default deIncomeStatement;
