import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const jaOverview: Record<string, TranslationEntry> = {
  "page.overview.periodInProgress": {
    message: "進行中",
    description:
      "Tooltip note on the Income vs Expenses chart for the current month, which has not ended yet",
  },
  "page.overview.chartFlows": {
    message: "資金フロー",
    description: "Disclosure label for the cash flow Sankey links table",
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
  "page.overview.cashFlow": {
    message: "キャッシュフロー",
    description: "Title for cash flow section",
  },
  "page.overview.failedToLoad": {
    message:
      "元帳の概要情報の読み込みに失敗しました。後でもう一度お試しください。",
    description: "Error description for overview page",
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
    message: "手元資金へ",
    description:
      "Cash flow chart destination for what the period took in (income, borrowing, sales) beyond what it paid out, which stays as cash on hand; not a ledger account, and not the same as income less spending",
  },
  "page.overview.cashFlowShortfall": {
    message: "手元資金から",
    description:
      "Cash flow chart source for what the period paid out (spending, investing, repaying debt) beyond what came in, drawn from cash already on hand; not a ledger account",
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
