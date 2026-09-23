export interface TranslationEntry {
  message: string;
  description: string;
}

const ukCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Товари",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Не вдалося завантажити товари",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "Історію цін не знайдено",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "У цій книзі не записано цін, тож історії обмінних курсів показати нема.",
    description:
      "Empty state description when the ledger records no commodity prices",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Історія цін з {count} точками даних",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "Показати історію цін {pair}",
    description: "Кнопка відкриття таблиці цін із датами",
  },
  "page.commodities.hidePriceHistory": {
    message: "Сховати історію цін {pair}",
    description: "Кнопка закриття таблиці цін із датами",
  },
  "page.commodities.priceHistoryDate": {
    message: "Дата",
    description: "Заголовок стовпця дат",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Ціна ({quote})",
    description: "Заголовок стовпця цін у валюті котирування",
  },
  "page.commodities.managedSources": {
    message: "Керовані джерела цін",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "Ціни, які ця книга отримує з керованого джерела. Вони оновлюються кожні кілька хвилин; ваші власні записи цін мають пріоритет.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "Актуальні",
    description:
      "Freshness badge: the managed feed was observed within the last ten minutes",
  },
  "page.commodities.freshness.stale": {
    message: "Застарілі",
    description:
      "Freshness badge: the managed feed's latest price is older than ten minutes",
  },
  "page.commodities.freshness.unavailable": {
    message: "Недоступні",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.observedAt": {
    message: "Отримано {time}",
    description:
      "When the feed's latest price was observed. {time} is a formatted date and time.",
  },
  "page.commodities.nextRefreshAt": {
    message: "Наступне оновлення {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "Ціну ще не отримано",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "Остання помилка: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "Оновити ціни",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "Оновлення…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "Не вдалося оновити ціни",
    description: "Toast shown when refreshing managed prices fails",
  },
};

export default ukCommodities;
