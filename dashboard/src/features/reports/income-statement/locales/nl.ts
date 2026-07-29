export interface TranslationEntry {
  message: string;
  description: string;
}

const nlIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "Uitgavenhiërarchie",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message:
      "Volg {ledgerName} uitgaven over verschillende grondstoffen in de tijd",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "Inkomstenhiërarchie",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message:
      "Volg {ledgerName} inkomsten over verschillende grondstoffen in de tijd",
    description: "Description for income chart",
  },
  "page.incomeStatement.monthlyNetIncome": {
    message: "Maandelijks netto inkomen",
    description: "Net income calculated monthly",
  },
  "page.incomeStatement.netProfitDescription": {
    message:
      "Volg {ledgerName} nettowinst over verschillende grondstoffen in de tijd",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message:
      "Geen winst- en verliesrekeninggegevens gevonden voor dit grootboek.",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "Selecteer grafiekmodus",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "Enkele Balken",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "Gestapelde Balken",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "Totale nettowinst over de geselecteerde periode",
    description: "Description for net profit summary table",
  },
};

export default nlIncomeStatement;
