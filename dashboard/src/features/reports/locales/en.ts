import enAccount from "../account/locales/en";
import enBalanceSheet from "../balance-sheet/locales/en";
import enIncomeStatement from "../income-statement/locales/en";
import enTrialBalance from "../trial-balance/locales/en";
import enOverview from "../overview/locales/en";

const enReportsShared = {
  "page.reports.hierarchyTitle": {
    message: "{sectionName} Hierarchy",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "{sectionName} List",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Visual representation of {ledgerName} {sectionName} composition",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "Detailed breakdown of {ledgerName} {sectionName} with USD and other commodity values",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "Income vs Expenses",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message:
      "Bar chart comparing total income and expenses for each interval in the selected period.",
    description: "Description for income vs expenses chart",
  },
};

const enReports = {
  ...enReportsShared,
  ...enAccount,
  ...enBalanceSheet,
  ...enIncomeStatement,
  ...enTrialBalance,
  ...enOverview,
};

export default enReports;
