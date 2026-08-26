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
};

export default ruReports;
