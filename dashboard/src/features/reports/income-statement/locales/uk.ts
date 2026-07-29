export interface TranslationEntry {
  message: string;
  description: string;
}

const ukIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "Ієрархія Витрат",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message: "Відстежуйте {ledgerName} витрати в різних валютах з часом",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "Ієрархія Доходів",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message: "Відстежуйте {ledgerName} доходи в різних валютах з часом",
    description: "Description for income chart",
  },
  "page.incomeStatement.monthlyNetIncome": {
    message: "Місячний чистий дохід",
    description: "Net income calculated monthly",
  },
  "page.incomeStatement.netProfitDescription": {
    message:
      "Відстежуйте {ledgerName} чистий прибуток в різних валютах з часом",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message: "Для цієї книги не знайдено даних звіту про прибутки та збитки.",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "Вибрати режим графіка",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "Окремі Стовпці",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "Складені Стовпці",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "Загальний чистий прибуток за вибраний період",
    description: "Description for net profit summary table",
  },
};

export default ukIncomeStatement;
