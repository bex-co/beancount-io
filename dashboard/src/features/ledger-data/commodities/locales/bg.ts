export interface TranslationEntry {
  message: string;
  description: string;
}

const bgCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "Стоки",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "Неуспешно зареждане на стоките",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "Няма история на цените",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "Този счетоводен регистър не записва цени на стоки, затова няма история на обменните курсове за показване.",
    description:
      "Empty state description when the ledger records no commodity prices",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "История на цените с {count} точки",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "Покажи история на цените за {pair}",
    description: "Бутон за показване на таблицата с датирани цени",
  },
  "page.commodities.hidePriceHistory": {
    message: "Скрий история на цените за {pair}",
    description: "Бутон за свиване на таблицата с датирани цени",
  },
  "page.commodities.priceHistoryDate": {
    message: "Дата",
    description: "Заглавие на колона за дати",
  },
  "page.commodities.priceHistoryPrice": {
    message: "Цена ({quote})",
    description: "Заглавие на колона за цени в котировъчната валута",
  },
  "page.commodities.managedSources": {
    message: "Управлявани източници на цени",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "Цени, които тази книга включва от управляван източник. Обновяват се на всеки няколко минути; вашите собствени записи за цени имат предимство.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "Актуални",
    description:
      "Freshness badge: the managed feed was observed within the last ten minutes",
  },
  "page.commodities.freshness.stale": {
    message: "Остарели",
    description:
      "Freshness badge: the managed feed's latest price is older than ten minutes",
  },
  "page.commodities.freshness.unavailable": {
    message: "Недостъпни",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.observedAt": {
    message: "Наблюдавано {time}",
    description:
      "When the feed's latest price was observed. {time} is a formatted date and time.",
  },
  "page.commodities.nextRefreshAt": {
    message: "Следващо обновяване {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "Все още няма получена цена",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "Последна грешка: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "Обнови цените",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "Обновяване…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "Цените не можаха да бъдат обновени",
    description: "Toast shown when refreshing managed prices fails",
  },
};

export default bgCommodities;
