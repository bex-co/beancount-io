import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const zhOverview: Record<string, TranslationEntry> = {
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
