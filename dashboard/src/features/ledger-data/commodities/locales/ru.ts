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
  "page.commodities.priceHistoryDataPoints": {
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
      "Freshness badge: the managed feed was observed within the last ten minutes",
  },
  "page.commodities.freshness.stale": {
    message: "Устарели",
    description:
      "Freshness badge: the managed feed's latest price is older than ten minutes",
  },
  "page.commodities.freshness.unavailable": {
    message: "Недоступны",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.observedAt": {
    message: "Получено {time}",
    description:
      "When the feed's latest price was observed. {time} is a formatted date and time.",
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
};

export default ruCommodities;
