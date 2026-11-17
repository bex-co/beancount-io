import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const zhOverview: Record<string, TranslationEntry> = {
  "page.overview.periodInProgress": {
    message: "进行中",
    description:
      "Tooltip note on the Income vs Expenses chart for the current month, which has not ended yet",
  },
  "page.overview.chartFlows": {
    message: "资金流",
    description: "Disclosure label for the cash flow Sankey links table",
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
  "page.overview.cashFlow": {
    message: "现金流",
    description: "Title for cash flow section",
  },
  "page.overview.failedToLoad": {
    message: "加载账本概览信息失败。请稍后重试。",
    description: "Error description for overview page",
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
    message: "存入现金",
    description:
      "Cash flow chart destination for what the period took in (income, borrowing, sales) beyond what it paid out, which stays as cash on hand; not a ledger account, and not the same as income less spending",
  },
  "page.overview.cashFlowShortfall": {
    message: "动用现金",
    description:
      "Cash flow chart source for what the period paid out (spending, investing, repaying debt) beyond what came in, drawn from cash already on hand; not a ledger account",
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
