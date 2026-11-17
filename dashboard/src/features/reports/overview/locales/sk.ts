import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const skOverview: Record<string, TranslationEntry> = {
  "page.overview.periodInProgress": {
    message: "Prebieha",
    description:
      "Tooltip note on the Income vs Expenses chart for the current month, which has not ended yet",
  },
  "page.overview.chartFlows": {
    message: "Toky",
    description: "Disclosure label for the cash flow Sankey links table",
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
  "page.overview.cashFlow": {
    message: "Peňažný tok",
    description: "Title for cash flow section",
  },
  "page.overview.failedToLoad": {
    message:
      "Nepodarilo sa načítať informácie o prehľade knihy. Prosím skúste to znova neskôr.",
    description: "Error description for overview page",
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
    message: "Do hotovosti",
    description:
      "Cash flow chart destination for what the period took in (income, borrowing, sales) beyond what it paid out, which stays as cash on hand; not a ledger account, and not the same as income less spending",
  },
  "page.overview.cashFlowShortfall": {
    message: "Z hotovosti",
    description:
      "Cash flow chart source for what the period paid out (spending, investing, repaying debt) beyond what came in, drawn from cash already on hand; not a ledger account",
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
