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
      "Подробна разбивка на {ledgerName} {sectionName} по сметка и стока",
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
  "page.overview.starButton.starSuccess": {
    message: "Книгата е добавена в любими",
    description: "Toast shown after starring a ledger",
  },
  "page.overview.starButton.starFailed": {
    message: "Неуспешно добавяне на книгата в любими",
    description: "Toast shown when starring a ledger fails",
  },
  "page.overview.starButton.unstarSuccess": {
    message: "Книгата е премахната от любими",
    description: "Toast shown after unstarring a ledger",
  },
  "page.overview.starButton.unstarFailed": {
    message: "Неуспешно премахване на книгата от любими",
    description: "Toast shown when unstarring a ledger fails",
  },
};

export default bgReports;
