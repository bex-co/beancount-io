export interface TranslationEntry {
  message: string;
  description: string;
}

const bgIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "Йерархия на Разходите",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message:
      "Проследяване на {ledgerName} разходи в различни стоки във времето",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "Йерархия на Приходите",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message: "Проследяване на {ledgerName} доходи в различни стоки във времето",
    description: "Description for income chart",
  },
  "page.incomeStatement.netProfitDescription": {
    message:
      "Проследяване на {ledgerName} нетна печалба в различни стоки във времето",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message: "Няма намерени данни за отчет за доходите за тази книга.",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "Изберете режим на диаграма",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "Единични Стълбове",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "Наслоени Стълбове",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "Обща нетна печалба за избрания период",
    description: "Description for net profit summary table",
  },
};

export default bgIncomeStatement;
