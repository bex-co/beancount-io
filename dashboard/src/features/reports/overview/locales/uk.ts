import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const ukOverview: Record<string, TranslationEntry> = {
  ...dashboardOverviewTranslations.uk,
  ...emptyLedgerOverviewTranslations.uk,
  "page.overview.assetsDistribution": {
    message: "Розподіл активів",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Візуальне представлення структури {ledgerName} активів",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Грошовий потік",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "Потік грошей від джерел доходу до витрат та інвестицій",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "Не вдалося завантажити інформацію про огляд книги. Спробуйте ще раз пізніше.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Пiabilities Distribution",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Візуальне представлення структури {ledgerName} зобов'язань",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "Пoading overview data…",
    description: "Loading message for overview data",
  },
  "page.overview.starButton.star": {
    message: "Зірка",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "З зіркою",
    description: "Button label indicating the ledger is starred",
  },
};

export default ukOverview;
