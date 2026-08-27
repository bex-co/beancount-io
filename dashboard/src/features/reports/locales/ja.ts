import jaAccount from "../account/locales/ja";
import jaBalanceSheet from "../balance-sheet/locales/ja";
import jaCashFlow from "../cash-flow/locales/ja";
import jaIncomeStatement from "../income-statement/locales/ja";
import jaTrialBalance from "../trial-balance/locales/ja";
import jaOverview from "../overview/locales/ja";
import jaExport from "../export/locales/ja";

const jaReportsShared = {
  "page.reports.hierarchyListDescription": {
    message: "{ledgerName}の{sectionName}の詳細内訳（USDおよびその他の商品値）",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "{sectionName}リスト",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "{sectionName}階層",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "{ledgerName}の{sectionName}構成の視覚的表示",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.incomeVsExpenses": {
    message: "収入対費用",
    description: "Title for income vs expenses chart",
  },
  "page.reports.incomeVsExpensesDescription": {
    message: "選択した期間の各インターバルの総収入と費用を比較する棒グラフ。",
    description: "Description for income vs expenses chart",
  },
};

const jaReports = {
  ...jaReportsShared,
  ...jaAccount,
  ...jaBalanceSheet,
  ...jaCashFlow,
  ...jaIncomeStatement,
  ...jaTrialBalance,
  ...jaOverview,
  ...jaExport,
  "page.overview.starButton.starSuccess": {
    message: "元帳にスターが付けられました",
    description: "Toast shown after starring a ledger",
  },
  "page.overview.starButton.starFailed": {
    message: "元帳にスターを付けることができませんでした",
    description: "Toast shown when starring a ledger fails",
  },
  "page.overview.starButton.unstarSuccess": {
    message: "元帳のスターが正常に解除されました",
    description: "Toast shown after unstarring a ledger",
  },
  "page.overview.starButton.unstarFailed": {
    message: "元帳のスターを外すことができませんでした",
    description: "Toast shown when unstarring a ledger fails",
  },
};

export default jaReports;
