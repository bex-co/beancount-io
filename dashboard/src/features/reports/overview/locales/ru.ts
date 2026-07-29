import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const ruOverview: Record<string, TranslationEntry> = {
  ...dashboardOverviewTranslations.ru,
  ...emptyLedgerOverviewTranslations.ru,
  "page.overview.assetsDistribution": {
    message: "Распределение активов",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Визуальное представление состава {ledgerName} активов",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Денежный поток",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "Поток денег от источников дохода к расходам и инвестициям",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "Не удалось загрузить обзорную информацию главной книги. Пожалуйста, попробуйте позже.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Обязательства Distribution",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Визуальное представление состава {ledgerName} обязательств",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "Загрузка обзорных данных…",
    description: "Loading message for overview data",
  },
  "page.overview.starButton.star": {
    message: "Звезда",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Со звездой",
    description: "Button label indicating the ledger is starred",
  },
};

export default ruOverview;
