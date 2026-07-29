import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const deOverview: Record<string, TranslationEntry> = {
  ...dashboardOverviewTranslations.de,
  ...emptyLedgerOverviewTranslations.de,
  "page.overview.assetsDistribution": {
    message: "Vermögensverteilung",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Visuelle Darstellung {ledgerName} Vermögenszusammensetzung",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Cashflow",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "Geldfluss von Einnahmequellen zu Ausgaben und Investitionen",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "Die Übersichtsinformationen zum Hauptbuch konnten nicht geladen werden. Bitte versuchen Sie es später erneut.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Verbindlichkeitenverteilung",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message:
      "Visuelle Darstellung {ledgerName} Verbindlichkeitenzusammensetzung",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "Übersichtsdaten werden geladen…",
    description: "Loading message for overview data",
  },
  "page.overview.starButton.star": {
    message: "Stern",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Mit Stern versehen",
    description: "Button label indicating the ledger is starred",
  },
};

export default deOverview;
