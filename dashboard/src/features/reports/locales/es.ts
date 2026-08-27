import esAccount from "../account/locales/es";
import esBalanceSheet from "../balance-sheet/locales/es";
import esCashFlow from "../cash-flow/locales/es";
import esIncomeStatement from "../income-statement/locales/es";
import esTrialBalance from "../trial-balance/locales/es";
import esOverview from "../overview/locales/es";
import esExport from "../export/locales/es";

const esReportsShared = {
  "page.reports.hierarchyListDescription": {
    message:
      "Desglose detallado de {ledgerName} {sectionName} con valores en USD y otras materias primas",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Lista de {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Jerarquía de {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message:
      "Representación visual de la composición de {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "Ingresos vs Gastos",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message:
      "Gráfico de barras que compara los ingresos y gastos totales de cada intervalo en el período seleccionado.",
    description: "Description for income vs expenses chart",
  },
};

const esReports = {
  ...esReportsShared,
  ...esAccount,
  ...esBalanceSheet,
  ...esCashFlow,
  ...esIncomeStatement,
  ...esTrialBalance,
  ...esOverview,
  ...esExport,
  "page.overview.starButton.starSuccess": {
    message: "Ledger protagonizó con éxito",
    description: "Toast shown after starring a ledger",
  },
  "page.overview.starButton.starFailed": {
    message: "No se pudo iniciar el libro mayor",
    description: "Toast shown when starring a ledger fails",
  },
  "page.overview.starButton.unstarSuccess": {
    message: "Libro mayor eliminado exitosamente",
    description: "Toast shown after unstarring a ledger",
  },
  "page.overview.starButton.unstarFailed": {
    message: "No se pudo quitar el estrella del libro mayor",
    description: "Toast shown when unstarring a ledger fails",
  },
};

export default esReports;
