export interface TranslationEntry {
  message: string;
  description: string;
}

const enIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.noData": {
    message: "No income statement data found for this ledger.",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "Select chart mode",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "Single Bars",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "Stacked Bars",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.netProfitDescription": {
    message:
      "Track {ledgerName} net profit across different commodities over time",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.incomeDescription": {
    message: "Track {ledgerName} income across different commodities over time",
    description: "Description for income chart",
  },
  "page.incomeStatement.expensesDescription": {
    message:
      "Track {ledgerName} expenses across different commodities over time",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "Income Hierarchy",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.expensesBreakdown": {
    message: "Expenses Hierarchy",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "Total net profit over the selected period",
    description: "Description for net profit summary table",
  },
};

export default enIncomeStatement;
