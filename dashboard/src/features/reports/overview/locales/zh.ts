import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const zhOverview: Record<string, TranslationEntry> = {
  "page.overview.chartBreakdown": {
    message: "明细",
    description: "Disclosure label for the distribution chart data table",
  },
  "page.overview.chartFlows": {
    message: "资金流",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.chartShare": {
    message: "总额占比",
    description: "Column header for each plotted slice share of the total",
  },
  "page.overview.chartMagnitudeShare": {
    message: "绝对值总额占比",
    description:
      "Column header for the absolute value share of the total magnitude in a signed distribution",
  },
  "page.overview.netWorthByMonth": {
    message: "每月净资产",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "月份",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.zh,
  ...emptyLedgerOverviewTranslations.zh,
  "page.overview.assetsDistribution": {
    message: "资产分布",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "{ledgerName}资产构成的可视化表示",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "现金流",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "资金从收入来源流向支出和投资",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message: "加载账本概览信息失败。请稍后重试。",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "负债分布",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "{ledgerName}负债构成的可视化表示",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "加载概览数据中…",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "正在加载账户角色…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "储蓄",
    description:
      "Cash flow chart node for what the period's income left after its outflows",
  },
  "page.overview.cashFlowShortfall": {
    message: "缺口",
    description:
      "Cash flow chart source for what the period spent beyond its inflows, drawn from earlier savings or credit; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message: "金额以 {unit} 显示。{others} 的余额未包含在内。",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
  },
  "page.overview.starButton.star": {
    message: "星标",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "已星标",
    description: "Button label indicating the ledger is starred",
  },
};

export default zhOverview;
