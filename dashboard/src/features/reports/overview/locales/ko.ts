import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const koOverview: Record<string, TranslationEntry> = {
  "page.overview.chartBreakdown": {
    message: "상세 내역",
    description: "Disclosure label for the distribution chart data table",
  },
  "page.overview.chartFlows": {
    message: "자금 흐름",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.chartShare": {
    message: "합계 대비 비중",
    description: "Column header for each plotted slice share of the total",
  },
  "page.overview.chartMagnitudeShare": {
    message: "절댓값 합계 대비 비중",
    description:
      "Column header for the absolute value share of the total magnitude in a signed distribution",
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
  "page.overview.assetsDistribution": {
    message: "자산 분포",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "{ledgerName} 자산 구성의 시각적 표현",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "현금 흐름",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "수입원에서 지출 및 투자로의 자금 흐름",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message: "장부 개요 정보를 불러오지 못했습니다. 나중에 다시 시도해 주세요.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "부채 분포",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "{ledgerName} 부채 구성의 시각적 표현",
    description: "Description for liabilities distribution chart",
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
    message: "저축",
    description:
      "Cash flow chart node for what the period's income left after its outflows",
  },
  "page.overview.cashFlowShortfall": {
    message: "부족액",
    description:
      "Cash flow chart source for what the period spent beyond its inflows, drawn from earlier savings or credit; not a ledger account",
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
