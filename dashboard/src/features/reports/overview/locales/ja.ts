import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const jaOverview: Record<string, TranslationEntry> = {
  "page.overview.chartBreakdown": {
    message: "内訳",
    description: "Disclosure label for the distribution chart data table",
  },
  "page.overview.chartFlows": {
    message: "資金フロー",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.chartShare": {
    message: "合計に対する割合",
    description: "Column header for each plotted slice share of the total",
  },
  "page.overview.chartMagnitudeShare": {
    message: "絶対値合計に対する割合",
    description:
      "Column header for the absolute value share of the total magnitude in a signed distribution",
  },
  "page.overview.netWorthByMonth": {
    message: "月別の純資産",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "月",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.ja,
  ...emptyLedgerOverviewTranslations.ja,
  "page.overview.assetsDistribution": {
    message: "資産分布",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "{ledgerName}の資産構成の視覚的表示",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "キャッシュフロー",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "収入源から費用と投資へのお金の流れ",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "元帳の概要情報の読み込みに失敗しました。後でもう一度お試しください。",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "負債分布",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "{ledgerName}の負債構成の視覚的表示",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "概要データを読み込み中…",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "アカウントの役割を読み込んでいます…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "貯蓄",
    description:
      "Cash flow chart node for what the period's income left after its outflows",
  },
  "page.overview.cashFlowShortfall": {
    message: "不足額",
    description:
      "Cash flow chart source for what the period spent beyond its inflows, drawn from earlier savings or credit; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message:
      "金額は {unit} で表示されています。{others} の残高は含まれていません。",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
  },
  "page.overview.starButton.star": {
    message: "スター",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "スター済み",
    description: "Button label indicating the ledger is starred",
  },
};

export default jaOverview;
