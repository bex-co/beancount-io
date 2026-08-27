import caAccount from "../account/locales/ca";
import caBalanceSheet from "../balance-sheet/locales/ca";
import caCashFlow from "../cash-flow/locales/ca";
import caIncomeStatement from "../income-statement/locales/ca";
import caTrialBalance from "../trial-balance/locales/ca";
import caOverview from "../overview/locales/ca";
import caExport from "../export/locales/ca";

const caReportsShared = {
  "page.reports.hierarchyListDescription": {
    message:
      "Desglossament detallat de {ledgerName} {sectionName} amb valors en USD i altres matèries primeres",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Llista {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Jerarquia {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message:
      "Representació visual de la composició de {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "Compte de resultats",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message: "Ingressos vs despeses",
    description: "Description for income vs expenses chart",
  },
};

const caReports = {
  ...caReportsShared,
  ...caAccount,
  ...caBalanceSheet,
  ...caCashFlow,
  ...caIncomeStatement,
  ...caTrialBalance,
  ...caOverview,
  ...caExport,
  "page.overview.starButton.starSuccess": {
    message: "Ledger s'ha destacat correctament",
    description: "Toast shown after starring a ledger",
  },
  "page.overview.starButton.starFailed": {
    message: "No s'ha pogut destacar el llibre major",
    description: "Toast shown when starring a ledger fails",
  },
  "page.overview.starButton.unstarSuccess": {
    message: "Ledger s'ha desmarcat correctament",
    description: "Toast shown after unstarring a ledger",
  },
  "page.overview.starButton.unstarFailed": {
    message: "No s'ha pogut desmarcar el llibre major",
    description: "Toast shown when unstarring a ledger fails",
  },
};

export default caReports;
