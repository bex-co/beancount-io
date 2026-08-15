export interface TranslationEntry {
  message: string;
  description: string;
}

const zhIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "支出层级",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message: "追踪{ledgerName}在不同商品上的支出随时间的变化",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "收入层级",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message: "追踪{ledgerName}在不同商品上的收入随时间的变化",
    description: "Description for income chart",
  },
  "page.incomeStatement.netProfitDescription": {
    message: "追踪{ledgerName}在不同商品上的净利润随时间的变化",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message: "未找到此账本的损益表数据。",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "选择图表模式",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "单条形图",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "堆叠条形图",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "所选期间的总净利润",
    description: "Description for net profit summary table",
  },
};

export default zhIncomeStatement;
