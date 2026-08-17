import ukAccount from "../account/locales/uk";
import ukBalanceSheet from "../balance-sheet/locales/uk";
import ukIncomeStatement from "../income-statement/locales/uk";
import ukTrialBalance from "../trial-balance/locales/uk";
import ukOverview from "../overview/locales/uk";
import ukExport from "../export/locales/uk";

const ukReportsShared = {
  "page.reports.hierarchyListDescription": {
    message:
      "Детальна розбивка {ledgerName} {sectionName} зі значеннями в USD та інших товарах",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Список {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Ієрархія {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Візуальне представлення складу {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "Доходи проти витрат",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message:
      "Бar chart comparing total income and expenses for each interval in the selected period.",
    description: "Description for income vs expenses chart",
  },
};

const ukReports = {
  ...ukReportsShared,
  ...ukAccount,
  ...ukBalanceSheet,
  ...ukIncomeStatement,
  ...ukTrialBalance,
  ...ukOverview,
  ...ukExport,
};

export default ukReports;
