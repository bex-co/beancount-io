import zhAccount from "../account/locales/zh";
import zhBalanceSheet from "../balance-sheet/locales/zh";
import zhCashFlow from "../cash-flow/locales/zh";
import zhIncomeStatement from "../income-statement/locales/zh";
import zhTrialBalance from "../trial-balance/locales/zh";
import zhOverview from "../overview/locales/zh";
import zhExport from "../export/locales/zh";

const zhReportsShared = {
  "page.reports.hierarchyListDescription": {
    message: "{ledgerName}{sectionName}的详细分解，包括美元和其他商品价值",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "{sectionName}列表",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "{sectionName}层级",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "{ledgerName}{sectionName}组成的可视化表示",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "收入与支出",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message: "在选定时期内每个区间的总收入和支出对比的柱状图。",
    description: "Description for income vs expenses chart",
  },
};

const zhReports = {
  ...zhReportsShared,
  ...zhAccount,
  ...zhBalanceSheet,
  ...zhCashFlow,
  ...zhIncomeStatement,
  ...zhTrialBalance,
  ...zhOverview,
  ...zhExport,
};

export default zhReports;
