import skAccount from "../account/locales/sk";
import skBalanceSheet from "../balance-sheet/locales/sk";
import skCashFlow from "../cash-flow/locales/sk";
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
  ...skCashFlow,
  ...skIncomeStatement,
  ...skTrialBalance,
  ...skOverview,
  ...skExport,
  "page.overview.starButton.starSuccess": {
    message: "Ledger bol úspešne označený hviezdičkou",
    description: "Toast shown after starring a ledger",
  },
  "page.overview.starButton.starFailed": {
    message: "Nepodarilo sa označiť knihu hviezdičkou",
    description: "Toast shown when starring a ledger fails",
  },
  "page.overview.starButton.unstarSuccess": {
    message: "Účtovná kniha bola úspešne odstránená hviezdičkou",
    description: "Toast shown after unstarring a ledger",
  },
  "page.overview.starButton.unstarFailed": {
    message: "Zrušenie účtovnej knihy hviezdičkou zlyhalo",
    description: "Toast shown when unstarring a ledger fails",
  },
};

export default skReports;
