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
  "page.overview.cashFlowRolesPending": {
    message: "Načítavajú sa roly účtov…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowToCash": {
    message: "Do peňažných prostriedkov",
    description:
      "Sankey node label for the period's net increase in cash and cash equivalents",
  },
  "page.overview.cashFlowFromCash": {
    message: "Z peňažných prostriedkov",
    description:
      "Sankey node label for the period's net decrease in cash and cash equivalents",
  },
  "page.overview.cashFlowUnshownUnits": {
    message:
      "Zobrazené v {currency}. Pre {units} neexistuje cena v {currency}, preto nie sú v grafe.",
    description:
      "Caption under the cash flow chart listing units that could not be converted to the presentation currency",
  },
  "page.overview.cashFlowNoFlows": {
    message: "V tomto období nie sú žiadne toky v {currency}.",
    description:
      "Empty state shown when the cash flow chart has no movement in the presentation currency",
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
