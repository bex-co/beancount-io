import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const jaOverview: Record<string, TranslationEntry> = {
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
