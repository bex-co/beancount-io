import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const ruOverview: Record<string, TranslationEntry> = {
  "page.overview.chartBreakdown": {
    message: "Распределение",
    description: "Disclosure label for the distribution chart data table",
  },
  "page.overview.chartFlows": {
    message: "Потоки",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.chartShare": {
    message: "Доля от общей суммы",
    description: "Column header for each plotted slice share of the total",
  },
  "page.overview.chartMagnitudeShare": {
    message: "Доля от суммы абсолютных значений",
    description:
      "Column header for the absolute value share of the total magnitude in a signed distribution",
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
  "page.overview.assetsDistribution": {
    message: "Распределение активов",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Визуальное представление состава {ledgerName} активов",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Денежный поток",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "Поток денег от источников дохода к расходам и инвестициям",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "Не удалось загрузить обзорную информацию главной книги. Пожалуйста, попробуйте позже.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Распределение обязательств",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Визуальное представление состава {ledgerName} обязательств",
    description: "Description for liabilities distribution chart",
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
    message: "Сбережения",
    description:
      "Cash flow chart node for what the period's income left after its outflows",
  },
  "page.overview.cashFlowShortfall": {
    message: "Дефицит",
    description:
      "Cash flow chart source for what the period spent beyond its inflows, drawn from earlier savings or credit; not a ledger account",
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
