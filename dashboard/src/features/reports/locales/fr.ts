import frAccount from "../account/locales/fr";
import frBalanceSheet from "../balance-sheet/locales/fr";
import frCashFlow from "../cash-flow/locales/fr";
import frIncomeStatement from "../income-statement/locales/fr";
import frTrialBalance from "../trial-balance/locales/fr";
import frOverview from "../overview/locales/fr";
import frExport from "../export/locales/fr";

const frReportsShared = {
  "page.reports.hierarchyListDescription": {
    message:
      "Répartition détaillée de {ledgerName} {sectionName} avec valeurs en USD et autres matières premières",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Liste {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Hiérarchie {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message:
      "Représentation visuelle de la composition de {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "Revenus vs Dépenses",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message:
      "Graphique à barres comparant les revenus et dépenses totaux pour chaque intervalle de la période sélectionnée.",
    description: "Description for income vs expenses chart",
  },
};

const frReports = {
  ...frReportsShared,
  ...frAccount,
  ...frBalanceSheet,
  ...frCashFlow,
  ...frIncomeStatement,
  ...frTrialBalance,
  ...frOverview,
  ...frExport,
  "page.overview.starButton.starSuccess": {
    message: "Ledger a été joué avec succès",
    description: "Toast shown after starring a ledger",
  },
  "page.overview.starButton.starFailed": {
    message: "Échec de la mise en vedette du grand livre",
    description: "Toast shown when starring a ledger fails",
  },
  "page.overview.starButton.unstarSuccess": {
    message: "Ledger a été supprimé des favoris avec succès",
    description: "Toast shown after unstarring a ledger",
  },
  "page.overview.starButton.unstarFailed": {
    message: "Échec de la désactivation du grand livre",
    description: "Toast shown when unstarring a ledger fails",
  },
};

export default frReports;
