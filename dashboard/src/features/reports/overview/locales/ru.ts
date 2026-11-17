import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const ruOverview: Record<string, TranslationEntry> = {
  "page.overview.periodInProgress": {
    message: "В процессе",
    description:
      "Tooltip note on the Income vs Expenses chart for the current month, which has not ended yet",
  },
  "page.overview.chartFlows": {
    message: "Потоки",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.netWorthByMonth": {
    message: "Чистые активы по месяцам",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "Месяц",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.ru,
  ...emptyLedgerOverviewTranslations.ru,
  "page.overview.cashFlow": {
    message: "Денежный поток",
    description: "Title for cash flow section",
  },
  "page.overview.failedToLoad": {
    message:
      "Не удалось загрузить обзорную информацию главной книги. Пожалуйста, попробуйте позже.",
    description: "Error description for overview page",
  },
  "page.overview.loading": {
    message: "Загрузка обзорных данных…",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Загрузка ролей счетов…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "В денежные средства",
    description:
      "Cash flow chart destination for what the period took in (income, borrowing, sales) beyond what it paid out, which stays as cash on hand; not a ledger account, and not the same as income less spending",
  },
  "page.overview.cashFlowShortfall": {
    message: "Из денежных средств",
    description:
      "Cash flow chart source for what the period paid out (spending, investing, repaying debt) beyond what came in, drawn from cash already on hand; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message: "Суммы показаны в {unit}. Остатки в {others} не включены.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
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
