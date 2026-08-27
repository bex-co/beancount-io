import ruAccount from "../account/locales/ru";
import ruBalanceSheet from "../balance-sheet/locales/ru";
import ruCashFlow from "../cash-flow/locales/ru";
import ruIncomeStatement from "../income-statement/locales/ru";
import ruTrialBalance from "../trial-balance/locales/ru";
import ruOverview from "../overview/locales/ru";
import ruExport from "../export/locales/ru";

const ruReportsShared = {
  "page.reports.hierarchyListDescription": {
    message:
      "Подробная разбивка {ledgerName} {sectionName} со значениями в USD и других товарах",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Список {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Иерархия {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Визуальное представление состава {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "Доход vs Expenses",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message:
      "Столбчатая диаграмма сравнения общих доходов и расходов за каждый интервал выбранного периода.",
    description: "Description for income vs expenses chart",
  },
};

const ruReports = {
  ...ruReportsShared,
  ...ruAccount,
  ...ruBalanceSheet,
  ...ruCashFlow,
  ...ruIncomeStatement,
  ...ruTrialBalance,
  ...ruOverview,
  ...ruExport,
  "page.overview.starButton.starSuccess": {
    message: "Леджер успешно снялся",
    description: "Toast shown after starring a ledger",
  },
  "page.overview.starButton.starFailed": {
    message: "Не удалось пометить реестр",
    description: "Toast shown when starring a ledger fails",
  },
  "page.overview.starButton.unstarSuccess": {
    message: "Ledger успешно снял пометку",
    description: "Toast shown after unstarring a ledger",
  },
  "page.overview.starButton.unstarFailed": {
    message: "Не удалось снять пометку с бухгалтерской книги.",
    description: "Toast shown when unstarring a ledger fails",
  },
};

export default ruReports;
