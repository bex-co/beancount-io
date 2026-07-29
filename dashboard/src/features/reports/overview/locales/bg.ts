import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const bgOverview: Record<string, TranslationEntry> = {
  ...dashboardOverviewTranslations.bg,
  ...emptyLedgerOverviewTranslations.bg,
  "page.overview.assetsDistribution": {
    message: "Разпределение на активи",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Визуално представяне на състава на {ledgerName} активи",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Паричен поток",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "Парично движение от източници на доходи към разходи и инвестиции",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "Неуспешно зареждане на обобщена информация за книгата. Моля, опитайте отново по-късно.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Разпределение на пасиви",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Визуално представяне на състава на {ledgerName} пасиви",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "Зареждане на обобщени данни…",
    description: "Loading message for overview data",
  },
  "page.overview.starButton.star": {
    message: "Звезда",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Със звезда",
    description: "Button label indicating the ledger is starred",
  },
};

export default bgOverview;
