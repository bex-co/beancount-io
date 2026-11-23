export interface TranslationEntry {
  message: string;
  description: string;
}

const ruCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Товары",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Не удалось загрузить товары",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "История цен не найдена",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "В этой книге не записаны цены, поэтому историю обменных курсов показать нечем.",
    description:
      "Empty state description when the ledger records no commodity prices",
  },
  "page.commodities.priceHistoryDataPoints_one": {
    message: "История цен с {count} точкой данных",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.priceHistoryDataPoints_few": {
    message: "История цен с {count} точками данных",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.priceHistoryDataPoints_many": {
    message: "История цен с {count} точками данных",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.priceHistoryDataPoints_other": {
    message: "История цен с {count} точками данных",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "Показать историю цен {pair}",
    description: "Кнопка открытия таблицы цен с датами",
  },
  "page.commodities.hidePriceHistory": {
    message: "Скрыть историю цен {pair}",
    description: "Кнопка закрытия таблицы цен с датами",
  },
  "page.commodities.priceHistoryDate": {
    message: "Дата",
    description: "Заголовок столбца дат",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Цена ({quote})",
    description: "Заголовок столбца цен в валюте котировки",
  },
  "page.commodities.managedSources": {
    message: "Управляемые источники цен",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "Цены, которые эта книга получает из управляемого источника. Они обновляются каждые несколько минут; ваши собственные записи цен имеют приоритет.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "Актуальны",
    description:
      "Freshness badge: the managed feed's newest price is at most seven days old",
  },
  "page.commodities.freshness.stale": {
    message: "Устарели",
    description:
      "Freshness badge: the managed feed's newest price is more than seven days old",
  },
  "page.commodities.freshness.unavailable": {
    message: "Недоступны",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.latestPriceDate": {
    message: "Последняя цена {date}",
    description:
      "Date of the managed feed's newest price. {date} is a formatted date.",
  },
  "page.commodities.nextRefreshAt": {
    message: "Следующее обновление {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "Цена ещё не получена",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "Последняя ошибка: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "Обновить цены",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "Обновление…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "Не удалось обновить цены",
    description: "Toast shown when refreshing managed prices fails",
  },
  "page.commodities.chartsReloadFailed": {
    message: "Цены обновлены, но графики не удалось перезагрузить.",
    description:
      "Shown on the managed price sources card when a refresh was acknowledged but reading the price charts again failed",
  },
  "page.commodities.reloadCharts": {
    message: "Перезагрузить графики",
    description:
      "Button that reads the price charts again after a failed reload, without refreshing the managed feeds",
  },
};

export default ruCommodities;
