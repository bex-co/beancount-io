import faAccount from "../account/locales/fa";
import faBalanceSheet from "../balance-sheet/locales/fa";
import faIncomeStatement from "../income-statement/locales/fa";
import faTrialBalance from "../trial-balance/locales/fa";
import faOverview from "../overview/locales/fa";
import faExport from "../export/locales/fa";

const faReportsShared = {
  "page.reports.hierarchyListDescription": {
    message:
      "تجزیه تفصیلی {ledgerName} {sectionName} با مقادیر USD و سایر کالاها",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "فهرست {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "سلسله مراتب {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "نمایش بصری ترکیب {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "درآمد در مقابل هزینه‌ها",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message:
      "نمودار میله‌ای مقایسه مجموع درآمد و هزینه‌ها برای هر بازه در دوره انتخابی.",
    description: "Description for income vs expenses chart",
  },
};

const faReports = {
  ...faReportsShared,
  ...faAccount,
  ...faBalanceSheet,
  ...faIncomeStatement,
  ...faTrialBalance,
  ...faOverview,
  ...faExport,
};

export default faReports;
