import caAccount from "../account/locales/ca";
import caBalanceSheet from "../balance-sheet/locales/ca";
import caIncomeStatement from "../income-statement/locales/ca";
import caTrialBalance from "../trial-balance/locales/ca";
import caOverview from "../overview/locales/ca";

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
  ...caIncomeStatement,
  ...caTrialBalance,
  ...caOverview,
};

export default caReports;
