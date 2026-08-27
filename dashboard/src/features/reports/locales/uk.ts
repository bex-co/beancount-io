import ukAccount from "../account/locales/uk";
import ukBalanceSheet from "../balance-sheet/locales/uk";
import ukCashFlow from "../cash-flow/locales/uk";
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
  ...ukCashFlow,
  ...ukIncomeStatement,
  ...ukTrialBalance,
  ...ukOverview,
  ...ukExport,
  "page.overview.starButton.starSuccess": {
    message: "Леджер успішно знявся",
    description: "Toast shown after starring a ledger",
  },
  "page.overview.starButton.starFailed": {
    message: "Не вдалося позначити книгу зірочкою",
    description: "Toast shown when starring a ledger fails",
  },
  "page.overview.starButton.unstarSuccess": {
    message: "Леджер успішно зняв зірочку",
    description: "Toast shown after unstarring a ledger",
  },
  "page.overview.starButton.unstarFailed": {
    message: "Не вдалося зняти зірочку з книги",
    description: "Toast shown when unstarring a ledger fails",
  },
};

export default ukReports;
