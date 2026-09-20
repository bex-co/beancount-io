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
};

export default bgCommodities;
