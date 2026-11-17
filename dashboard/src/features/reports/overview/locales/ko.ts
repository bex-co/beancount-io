import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const koOverview: Record<string, TranslationEntry> = {
  "page.overview.periodInProgress": {
    message: "진행 중",
    description:
      "Tooltip note on the Income vs Expenses chart for the current month, which has not ended yet",
  },
  "page.overview.chartFlows": {
    message: "자금 흐름",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.netWorthByMonth": {
    message: "월별 순자산",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "월",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.ko,
  ...emptyLedgerOverviewTranslations.ko,
  "page.overview.cashFlow": {
    message: "현금 흐름",
    description: "Title for cash flow section",
  },
  "page.overview.failedToLoad": {
    message: "장부 개요 정보를 불러오지 못했습니다. 나중에 다시 시도해 주세요.",
    description: "Error description for overview page",
  },
  "page.overview.loading": {
    message: "개요 데이터 불러오는 중…",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "계정 역할을 불러오는 중…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "보유 현금으로",
    description:
      "Cash flow chart destination for what the period took in (income, borrowing, sales) beyond what it paid out, which stays as cash on hand; not a ledger account, and not the same as income less spending",
  },
  "page.overview.cashFlowShortfall": {
    message: "보유 현금에서",
    description:
      "Cash flow chart source for what the period paid out (spending, investing, repaying debt) beyond what came in, drawn from cash already on hand; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message:
      "금액은 {unit}(으)로 표시됩니다. {others} 잔액은 포함되지 않습니다.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
  },
  "page.overview.starButton.star": {
    message: "즐겨찾기",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "즐겨찾기됨",
    description: "Button label indicating the ledger is starred",
  },
};

export default koOverview;
