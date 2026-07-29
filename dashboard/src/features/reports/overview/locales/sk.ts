import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const skOverview: Record<string, TranslationEntry> = {
  ...dashboardOverviewTranslations.sk,
  ...emptyLedgerOverviewTranslations.sk,
  "page.overview.assetsDistribution": {
    message: "Rozloženie aktív",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Vizuálna reprezentácia zloženia {ledgerName} aktív",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Peňažný tok",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "Tok peňazí zo zdrojov príjmov na výdavky a investície",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "Nepodarilo sa načítať informácie o prehľade knihy. Prosím skúste to znova neskôr.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Rozloženie záväzkov",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Vizuálna reprezentácia zloženia {ledgerName} záväzkov",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "Načítavam údaje prehľadu...",
    description: "Loading message for overview data",
  },
  "page.overview.starButton.star": {
    message: "Hviezda",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "S hviezdou",
    description: "Button label indicating the ledger is starred",
  },
};

export default skOverview;
