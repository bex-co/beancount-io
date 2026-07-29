import ptAccount from "../account/locales/pt";
import ptBalanceSheet from "../balance-sheet/locales/pt";
import ptIncomeStatement from "../income-statement/locales/pt";
import ptTrialBalance from "../trial-balance/locales/pt";
import ptOverview from "../overview/locales/pt";

const ptReportsShared = {
  "page.reports.hierarchyListDescription": {
    message:
      "Detalhamento de {ledgerName} {sectionName} com valores em USD e outras commodities",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Lista {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Hierarquia {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Representação visual da composição de {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "Renda vs Despesas",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message:
      "Gráfico de barras comparando renda total e despesas para cada intervalo no período selecionado.",
    description: "Description for income vs expenses chart",
  },
};

const ptReports = {
  ...ptReportsShared,
  ...ptAccount,
  ...ptBalanceSheet,
  ...ptIncomeStatement,
  ...ptTrialBalance,
  ...ptOverview,
};

export default ptReports;
