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
};

export default ruCommodities;
