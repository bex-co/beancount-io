import nlAccount from "../account/locales/nl";
import nlBalanceSheet from "../balance-sheet/locales/nl";
import nlIncomeStatement from "../income-statement/locales/nl";
import nlTrialBalance from "../trial-balance/locales/nl";
import nlOverview from "../overview/locales/nl";

const nlReportsShared = {
  "page.reports.hierarchyListDescription": {
    message:
      "Gedetailleerde uitsplitsing van {ledgerName} {sectionName} met USD- en andere grondstofwaarden",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "{sectionName} Lijst",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "{sectionName} Hiërarchie",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Visuele weergave van {ledgerName} {sectionName} samenstelling",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "Inkomsten vs uitgaven",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message:
      "Staafdiagram waarin totale inkomsten en uitgaven worden vergeleken voor elk interval in de geselecteerde periode.",
    description: "Description for income vs expenses chart",
  },
};

const nlReports = {
  ...nlReportsShared,
  ...nlAccount,
  ...nlBalanceSheet,
  ...nlIncomeStatement,
  ...nlTrialBalance,
  ...nlOverview,
};

export default nlReports;
