export interface TranslationEntry {
  message: string;
  description: string;
}

const faIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "سلسله مراتب هزینه‌ها",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message: "پیگیری هزینه‌های {ledgerName} در ارزهای مختلف در طول زمان",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "سلسله مراتب درآمدها",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message: "پیگیری درآمد {ledgerName} در ارزهای مختلف در طول زمان",
    description: "Description for income chart",
  },
  "page.incomeStatement.monthlyNetIncome": {
    message: "درآمد خالص ماهانه",
    description: "Net income calculated monthly",
  },
  "page.incomeStatement.netProfitDescription": {
    message: "پیگیری سود خالص {ledgerName} در ارزهای مختلف در طول زمان",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message: "هیچ داده صورت سود و زیانی برای این دفتر یافت نشد.",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "انتخاب حالت نمودار",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "میله‌های منفرد",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "میله‌های انباشته",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "سود خالص کل در دوره انتخاب شده",
    description: "Description for net profit summary table",
  },
};

export default faIncomeStatement;
