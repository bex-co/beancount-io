import skAccount from "../account/locales/sk";
import skBalanceSheet from "../balance-sheet/locales/sk";
import skIncomeStatement from "../income-statement/locales/sk";
import skTrialBalance from "../trial-balance/locales/sk";
import skOverview from "../overview/locales/sk";
import skExport from "../export/locales/sk";

const skReportsShared = {
  "page.reports.hierarchyListDescription": {
    message:
      "Podrobný rozpis {ledgerName} {sectionName} s hodnotami v USD a iných komoditách",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Zoznam {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Hierarchia {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Vizuálne znázornenie zloženia {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "Príjmy vs Výdavky",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message:
      "Stĺpcový graf porovnávajúci celkové príjmy a výdavky pre každý interval vo vybranom období.",
    description: "Description for income vs expenses chart",
  },
};

const skReports = {
  ...skReportsShared,
  ...skAccount,
  ...skBalanceSheet,
  ...skIncomeStatement,
  ...skTrialBalance,
  ...skOverview,
  ...skExport,
};

export default skReports;
