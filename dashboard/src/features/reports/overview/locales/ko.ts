import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const koOverview: Record<string, TranslationEntry> = {
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
