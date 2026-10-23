import { dashboardOverviewTranslations } from "../dashboard-translations";
import { emptyLedgerOverviewTranslations } from "../empty-ledger-translations";

export interface TranslationEntry {
  message: string;
  description: string;
}

const bgOverview: Record<string, TranslationEntry> = {
  "page.overview.chartBreakdown": {
    message: "Разбивка",
    description: "Disclosure label for the distribution chart data table",
  },
  "page.overview.chartFlows": {
    message: "Потоци",
    description: "Disclosure label for the cash flow Sankey links table",
  },
  "page.overview.chartShare": {
    message: "Дял от общата сума",
    description: "Column header for each plotted slice share of the total",
  },
  "page.overview.chartMagnitudeShare": {
    message: "Дял от общата абсолютна стойност",
    description:
      "Column header for the absolute value share of the total magnitude in a signed distribution",
  },
  "page.overview.netWorthByMonth": {
    message: "Нетна стойност по месеци",
    description:
      "Caption of the Net Worth card's table view, one row per month",
  },
  "page.overview.netWorthMonth": {
    message: "Месец",
    description: "Column header for the month in the Net Worth table view",
  },
  ...dashboardOverviewTranslations.bg,
  ...emptyLedgerOverviewTranslations.bg,
  "page.overview.assetsDistribution": {
    message: "Разпределение на активи",
    description: "Title for assets distribution chart",
  },
  "page.overview.assetsDistributionDescription": {
    message: "Визуално представяне на състава на {ledgerName} активи",
    description: "Description for assets distribution chart",
  },
  "page.overview.cashFlow": {
    message: "Паричен поток",
    description: "Title for cash flow section",
  },
  "page.overview.cashFlowDescription": {
    message: "Парично движение от източници на доходи към разходи и инвестиции",
    description: "Description for cash flow sankey diagram",
  },
  "page.overview.failedToLoad": {
    message:
      "Неуспешно зареждане на обобщена информация за книгата. Моля, опитайте отново по-късно.",
    description: "Error description for overview page",
  },
  "page.overview.liabilitiesDistribution": {
    message: "Разпределение на пасиви",
    description: "Title for liabilities distribution chart",
  },
  "page.overview.liabilitiesDistributionDescription": {
    message: "Визуално представяне на състава на {ledgerName} пасиви",
    description: "Description for liabilities distribution chart",
  },
  "page.overview.loading": {
    message: "Зареждане на обобщени данни…",
    description: "Loading message for overview data",
  },
  "page.overview.cashFlowRolesPending": {
    message: "Зареждане на ролите на сметките…",
    description:
      "Pending state shown in the cash flow chart while account metadata (cash-flow-role declarations) is still loading",
  },
  "page.overview.cashFlowSavings": {
    message: "Спестявания",
    description:
      "Cash flow chart node for what the period's income left after its outflows",
  },
  "page.overview.cashFlowShortfall": {
    message: "Недостиг",
    description:
      "Cash flow chart source for what the period spent beyond its inflows, drawn from earlier savings or credit; not a ledger account",
  },
  "page.overview.chartUnitScope": {
    message: "Сумите са показани в {unit}. Салдата в {others} не са включени.",
    description:
      "Note under an overview chart when the ledger holds balances in more than one unit. {unit} is the unit the chart is drawn in; {others} is a comma-separated list of the units it leaves out.",
  },
  "page.overview.starButton.star": {
    message: "Звезда",
    description: "Button label to star a ledger",
  },
  "page.overview.starButton.starred": {
    message: "Със звезда",
    description: "Button label indicating the ledger is starred",
  },
};

export default bgOverview;
