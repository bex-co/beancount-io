import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const nlOverview: Record<string, TranslationEntry> = {
  ...dashboardOverviewTranslations.nl,
  ...emptyLedgerOverviewTranslations.nl,
  "page.overview.assetsDistribution": {
    message: "Verdeling van activa",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Visuele weergave van {ledgerName} activasamenstelling",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Kasstromen",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "Geldstroom van inkomstenbronnen naar uitgaven en investeringen",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "Overzichtsinformatie van grootboek laden mislukt. Probeer het later opnieuw.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Verdeling van passiva",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Visuele weergave van {ledgerName} passivasamenstelling",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "Overzichtsgegevens laden…",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Rekeningrollen laden…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowToCash": {
    message: "Naar liquide middelen",
    description:
      "Sankey node label for the period's net increase in cash and cash equivalents",
  },
  "page.overview.cashFlowFromCash": {
    message: "Uit liquide middelen",
    description:
      "Sankey node label for the period's net decrease in cash and cash equivalents",
  },
  "page.overview.cashFlowUnshownUnits": {
    message:
      "Weergegeven in {currency}. Voor {units} is er geen koers naar {currency}, dus die staan niet in de grafiek.",
    description:
      "Caption under the cash flow chart listing units that could not be converted to the presentation currency",
  },
  "page.overview.cashFlowNoFlows": {
    message: "Geen {currency}-stromen in deze periode.",
    description:
      "Empty state shown when the cash flow chart has no movement in the presentation currency",
  },
  "page.overview.starButton.star": {
    message: "Ster",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Met ster",
    description: "Button label indicating the ledger is starred",
  },
};

export default nlOverview;
