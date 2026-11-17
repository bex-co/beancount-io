import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const esOverview: Record<string, TranslationEntry> = {
  "page.overview.periodInProgress": {
    message: "En curso",
    description:
      "Tooltip note on the Income vs Expenses chart for the current month, which has not ended yet",
  },
  "page.overview.chartFlows": {
    message: "Flujos",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.netWorthByMonth": {
    message: "Patrimonio neto por mes",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "Mes",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.es,
  ...emptyLedgerOverviewTranslations.es,
  "page.overview.cashFlow": {
    message: "Flujo de caja",
    description: "Title for cash flow section",
  },
  "page.overview.failedToLoad": {
    message:
      "Error al cargar la información general del libro mayor. Por favor, inténtelo de nuevo más tarde.",
    description: "Error description for overview page",
  },
  "page.overview.loading": {
    message: "Cargando datos generales...",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Cargando los roles de las cuentas…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "Al efectivo",
    description:
      "Cash flow chart destination for what the period took in (income, borrowing, sales) beyond what it paid out, which stays as cash on hand; not a ledger account, and not the same as income less spending",
  },
  "page.overview.cashFlowShortfall": {
    message: "Del efectivo",
    description:
      "Cash flow chart source for what the period paid out (spending, investing, repaying debt) beyond what came in, drawn from cash already on hand; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message:
      "Los importes se muestran en {unit}. Los saldos en {others} no están incluidos.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
  },
  "page.overview.starButton.star": {
    message: "Estrella",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Con estrella",
    description: "Button label indicating the ledger is starred",
  },
};

export default esOverview;
