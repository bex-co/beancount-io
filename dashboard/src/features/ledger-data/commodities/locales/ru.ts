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
  "page.commodities.failedToLoadCommoditiesDescription": {
    message:
      "Произошла ошибка при загрузке данных товаров. Пожалуйста, попробуйте позже.",
    description: "Error description when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "Товары не найдены",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "В этой главной книге пока нет данных о ценах товаров.",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "История цен с {count} точками данных",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
};

export default ruCommodities;
