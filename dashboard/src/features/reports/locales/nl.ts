import nlAccount from "../account/locales/nl";
import nlBalanceSheet from "../balance-sheet/locales/nl";
import nlCashFlow from "../cash-flow/locales/nl";
import nlIncomeStatement from "../income-statement/locales/nl";
import nlTrialBalance from "../trial-balance/locales/nl";
import nlOverview from "../overview/locales/nl";
import nlExport from "../export/locales/nl";

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
  ...nlCashFlow,
  ...nlIncomeStatement,
  ...nlTrialBalance,
  ...nlOverview,
  ...nlExport,
  "page.overview.starButton.starSuccess": {
    message: "Ledger heeft een succesvolle ster gekregen",
    description: "Toast shown after starring a ledger",
  },
  "page.overview.starButton.starFailed": {
    message: "Kan het grootboek geen sterren geven",
    description: "Toast shown when starring a ledger fails",
  },
  "page.overview.starButton.unstarSuccess": {
    message: "Grootboek heeft de ster succesvol verwijderd",
    description: "Toast shown after unstarring a ledger",
  },
  "page.overview.starButton.unstarFailed": {
    message: "Kan de ster van het grootboek niet verwijderen",
    description: "Toast shown when unstarring a ledger fails",
  },
};

export default nlReports;
