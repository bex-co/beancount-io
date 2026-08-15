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
    message: "Няма намерени стоки",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "Тази книга все още няма данни за цени на стоки.",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "История на цените с {count} точки",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
};

export default bgCommodities;
