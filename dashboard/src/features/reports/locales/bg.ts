import bgAccount from "../account/locales/bg";
import bgBalanceSheet from "../balance-sheet/locales/bg";
import bgCashFlow from "../cash-flow/locales/bg";
import bgIncomeStatement from "../income-statement/locales/bg";
import bgTrialBalance from "../trial-balance/locales/bg";
import bgOverview from "../overview/locales/bg";
import bgExport from "../export/locales/bg";

const bgReportsShared = {
  "page.reports.hierarchyListDescription": {
    message:
      "Подробна разбивка на {ledgerName} {sectionName} със стойности в USD и други стоки",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Списък {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Йерархия {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Визуално представяне на състава на {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "Доходи срещу разходи",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message:
      "Стълбовидна диаграма, сравняваща общите доходи и разходи за всеки интервал в избрания период.",
    description: "Description for income vs expenses chart",
  },
};

const bgReports = {
  ...bgReportsShared,
  ...bgAccount,
  ...bgBalanceSheet,
  ...bgCashFlow,
  ...bgIncomeStatement,
  ...bgTrialBalance,
  ...bgOverview,
  ...bgExport,
};

export default bgReports;
