import deAccount from "../account/locales/de";
import deBalanceSheet from "../balance-sheet/locales/de";
import deIncomeStatement from "../income-statement/locales/de";
import deTrialBalance from "../trial-balance/locales/de";
import deOverview from "../overview/locales/de";

const deReportsShared = {
  "page.reports.hierarchyListDescription": {
    message:
      "Detaillierte Aufschlüsselung {ledgerName} {sectionName} mit USD- und anderen Rohstoffwerten",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "{sectionName} Liste",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "{sectionName} Hierarchie",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Visuelle Darstellung {ledgerName} {sectionName}-Zusammensetzung",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "Erträge vs. Aufwendungen",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message:
      "Balkendiagramm zum Vergleich der Gesamterträge und -aufwendungen für jedes Intervall im ausgewählten Zeitraum.",
    description: "Description for income vs expenses chart",
  },
};

const deReports = {
  ...deReportsShared,
  ...deAccount,
  ...deBalanceSheet,
  ...deIncomeStatement,
  ...deTrialBalance,
  ...deOverview,
};

export default deReports;
