export interface TranslationEntry {
  message: string;
  description: string;
}

const faCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "کالاها و ارزها",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "بارگذاری کالاها و ارزها ناموفق بود",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "کالا یا ارزی یافت نشد",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "این دفتر هنوز داده‌ای از قیمت کالا یا ارز ندارد.",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "تاریخچه قیمت با {count} نقطه داده",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
};

export default faCommodities;
