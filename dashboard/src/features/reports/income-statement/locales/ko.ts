export interface TranslationEntry {
  message: string;
  description: string;
}

const koIncomeStatement: Record<string, TranslationEntry> = {
  "page.incomeStatement.expensesBreakdown": {
    message: "지출 계층",
    description: "Tab label for expenses hierarchy section",
  },
  "page.incomeStatement.expensesDescription": {
    message: "{ledgerName}의 지출을 시간에 따라 다양한 상품별로 추적",
    description: "Description for expenses chart",
  },
  "page.incomeStatement.incomeBreakdown": {
    message: "수입 계층",
    description: "Tab label for income hierarchy section",
  },
  "page.incomeStatement.incomeDescription": {
    message: "{ledgerName}의 수입을 시간에 따라 다양한 상품별로 추적",
    description: "Description for income chart",
  },
  "page.incomeStatement.monthlyNetIncome": {
    message: "월별 순수입",
    description: "Net income calculated monthly",
  },
  "page.incomeStatement.netProfitDescription": {
    message: "{ledgerName}의 순이익을 시간에 따라 다양한 상품별로 추적",
    description: "Description for net profit chart",
  },
  "page.incomeStatement.noData": {
    message: "이 장부의 손익계산서 데이터를 찾을 수 없습니다.",
    description: "Empty state message for income statement",
  },
  "page.incomeStatement.selectChartMode": {
    message: "차트 모드 선택",
    description: "Placeholder for chart mode select dropdown",
  },
  "page.incomeStatement.singleBars": {
    message: "단일 막대",
    description: "Chart mode option for single bars",
  },
  "page.incomeStatement.stackedBars": {
    message: "누적 막대",
    description: "Chart mode option for stacked bars",
  },
  "page.incomeStatement.totalNetProfitOverPeriod": {
    message: "선택한 기간의 총 순이익",
    description: "Description for net profit summary table",
  },
};

export default koIncomeStatement;
