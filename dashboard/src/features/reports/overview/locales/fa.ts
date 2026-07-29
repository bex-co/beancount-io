import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const faOverview: Record<string, TranslationEntry> = {
  ...dashboardOverviewTranslations.fa,
  ...emptyLedgerOverviewTranslations.fa,
  "page.overview.assetsDistribution": {
    message: "توزیع دارایی‌ها",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "نمایش بصری از ترکیب دارایی‌های {ledgerName}",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "جریان نقدینگی",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "جریان پول از منابع درآمد به هزینه‌ها و سرمایه‌گذاری‌ها",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "بارگذاری اطلاعات خلاصه دفتر ناموفق بود. لطفاً بعداً دوباره تلاش کنید.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "توزیع بدهی‌ها",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "نمایش بصری از ترکیب بدهی‌های {ledgerName}",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "در حال بارگذاری داده‌های خلاصه…",
    description: "Loading message for overview data",
  },
  "page.overview.starButton.star": {
    message: "ستاره",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "ستاره‌دار",
    description: "Button label indicating the ledger is starred",
  },
};

export default faOverview;
