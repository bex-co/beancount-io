import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const ukOverview: Record<string, TranslationEntry> = {
  "page.overview.periodInProgress": {
    message: "Триває",
    description:
      "Tooltip note on the Income vs Expenses chart for the current month, which has not ended yet",
  },
  "page.overview.chartFlows": {
    message: "Потоки",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.netWorthByMonth": {
    message: "Чисті активи за місяцями",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "Місяць",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.uk,
  ...emptyLedgerOverviewTranslations.uk,
  "page.overview.cashFlow": {
    message: "Грошовий потік",
    description: "Title for cash flow section",
  },
  "page.overview.failedToLoad": {
    message:
      "Не вдалося завантажити інформацію про огляд книги. Спробуйте ще раз пізніше.",
    description: "Error description for overview page",
  },
  "page.overview.loading": {
    message: "Завантаження оглядових даних…",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Завантаження ролей рахунків…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "У грошові кошти",
    description:
      "Cash flow chart destination for what the period took in (income, borrowing, sales) beyond what it paid out, which stays as cash on hand; not a ledger account, and not the same as income less spending",
  },
  "page.overview.cashFlowShortfall": {
    message: "З грошових коштів",
    description:
      "Cash flow chart source for what the period paid out (spending, investing, repaying debt) beyond what came in, drawn from cash already on hand; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message: "Суми показано в {unit}. Залишки в {others} не включено.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
  },
  "page.overview.starButton.star": {
    message: "Зірка",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "З зіркою",
    description: "Button label indicating the ledger is starred",
  },
};

export default ukOverview;
