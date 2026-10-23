import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const nlOverview: Record<string, TranslationEntry> = {
  "page.overview.chartBreakdown": {
    message: "Uitsplitsing",
    description: "Disclosure label for the distribution chart data table",
  },
  "page.overview.chartFlows": {
    message: "Geldstromen",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.chartShare": {
    message: "Aandeel van totaal",
    description: "Column header for each plotted slice share of the total",
  },
  "page.overview.chartMagnitudeShare": {
    message: "Aandeel van absoluut totaal",
    description:
      "Column header for the absolute value share of the total magnitude in a signed distribution",
  },
  "page.overview.netWorthByMonth": {
    message: "Nettovermogen per maand",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "Maand",
    description: "Column header for the month in the Net Worth table view",
  },
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
  "page.overview.cashFlowSavings": {
    message: "Spaargeld",
    description:
      "Cash flow chart node for what the period's income left after its outflows",
  },
  "page.overview.cashFlowShortfall": {
    message: "Tekort",
    description:
      "Cash flow chart source for what the period spent beyond its inflows, drawn from earlier savings or credit; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message:
      "Bedragen worden weergegeven in {unit}. Saldi in {others} zijn niet inbegrepen.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
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
