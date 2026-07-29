export interface TranslationEntry {
  message: string;
  description: string;
}

const skIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "Hierarchia Výdavkov",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message: "Sledujte {ledgerName} výdavky v rôznych menách v čase",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "Hierarchia Príjmov",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message: "Sledujte {ledgerName} príjmy v rôznych menách v čase",
    description: "Description for income chart",
  },
  "page.incomeStatement.monthlyNetIncome": {
    message: "Mesačný čistý príjem",
    description: "Net income calculated monthly",
  },
  "page.incomeStatement.netProfitDescription": {
    message: "Sledujte {ledgerName} čistý zisk v rôznych menách v čase",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message:
      "Pre tento účtovný denník sa nenašli žiadne údaje výkazu ziskov a strát.",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "Vybrať režim grafu",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "Jednotlivé Stĺpce",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "Stĺpce Navrstvené",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "Celkový čistý zisk za vybrané obdobie",
    description: "Description for net profit summary table",
  },
};

export default skIncomeStatement;
