import koAccount from "../account/locales/ko";
import koBalanceSheet from "../balance-sheet/locales/ko";
import koCashFlow from "../cash-flow/locales/ko";
import koIncomeStatement from "../income-statement/locales/ko";
import koTrialBalance from "../trial-balance/locales/ko";
import koOverview from "../overview/locales/ko";
import koExport from "../export/locales/ko";

const koReportsShared = {
  "page.reports.hierarchyListDescription": {
    message:
      "{ledgerName}의 {sectionName} 상세 분석 (USD 및 기타 상품 값 포함)",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "{sectionName} 목록",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "{sectionName} 계층",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "{ledgerName}의 {sectionName} 구성의 시각적 표현",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "수입 대 지출",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message: "선택한 기간의 각 구간별 총 수입과 지출을 비교하는 막대 차트.",
    description: "Description for income vs expenses chart",
  },
};

const koReports = {
  ...koReportsShared,
  ...koAccount,
  ...koBalanceSheet,
  ...koCashFlow,
  ...koIncomeStatement,
  ...koTrialBalance,
  ...koOverview,
  ...koExport,
};

export default koReports;
