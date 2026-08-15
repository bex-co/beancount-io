export interface TranslationEntry {
  message: string;
  description: string;
}

const jaIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "費用階層",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message: "{ledgerName}の費用を時系列でさまざまな商品にわたって追跡",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "収入階層",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message: "{ledgerName}の収入を時系列でさまざまな商品にわたって追跡",
    description: "Description for income chart",
  },
  "page.incomeStatement.netProfitDescription": {
    message: "{ledgerName}の純利益を時系列でさまざまな商品にわたって追跡",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message: "この元帳の損益計算書データが見つかりません。",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "チャートモードを選択",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "単一バー",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "積み上げバー",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "選択した期間の総純利益",
    description: "Description for net profit summary table",
  },
};

export default jaIncomeStatement;
