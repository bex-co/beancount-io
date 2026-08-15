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
    message: "Товарів не знайдено",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "У цій книзі ще немає даних про ціни товарів.",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "Історія цін з {count} точками даних",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
};

export default ukCommodities;
