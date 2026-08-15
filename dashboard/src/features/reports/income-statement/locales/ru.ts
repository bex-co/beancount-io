export interface TranslationEntry {
  message: string;
  description: string;
}

const ruIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "Иерархия Расходов",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message:
      "Отслеживание {ledgerName} расходов по различным товарам со временем",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "Иерархия Доходов",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message:
      "Отслеживание {ledgerName} доходов по различным товарам со временем",
    description: "Description for income chart",
  },
  "page.incomeStatement.netProfitDescription": {
    message:
      "Отслеживание {ledgerName} чистой прибыли по различным товарам со временем",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message:
      "Данные отчёта о прибылях и убытках не найдены для этой главной книги.",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "Выбрать режим графика",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "Отдельные Столбцы",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "Составные Столбцы",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "Общая чистая прибыль за выбранный период",
    description: "Description for net profit summary table",
  },
};

export default ruIncomeStatement;
