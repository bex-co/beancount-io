import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const skOverview: Record<string, TranslationEntry> = {
  "page.overview.chartBreakdown": {
    message: "Rozpis",
    description: "Disclosure label for the distribution chart data table",
  },
  "page.overview.chartFlows": {
    message: "Toky",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.chartShare": {
    message: "Podiel na celku",
    description: "Column header for each plotted slice share of the total",
  },
  "page.overview.chartMagnitudeShare": {
    message: "Podiel na súčte absolútnych hodnôt",
    description:
      "Column header for the absolute value share of the total magnitude in a signed distribution",
  },
  "page.overview.netWorthByMonth": {
    message: "Čisté imanie podľa mesiacov",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "Mesiac",
    description: "Column header for the month in the Net Worth table view",
  },
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
  "page.overview.cashFlowSavings": {
    message: "Úspory",
    description:
      "Cash flow chart node for what the period's income left after its outflows",
  },
  "page.overview.cashFlowShortfall": {
    message: "Schodok",
    description:
      "Cash flow chart source for what the period spent beyond its inflows, drawn from earlier savings or credit; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message: "Sumy sú zobrazené v {unit}. Zostatky v {others} nie sú zahrnuté.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
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
