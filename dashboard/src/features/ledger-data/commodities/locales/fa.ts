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
  "page.commodities.showPriceHistory": {
    message: "نمایش تاریخچه قیمت {pair}",
    description: "دکمه آشکار کردن جدول قیمت‌های تاریخ‌دار",
  },
  "page.commodities.hidePriceHistory": {
    message: "پنهان کردن تاریخچه قیمت {pair}",
    description: "دکمه بستن جدول قیمت‌های تاریخ‌دار",
  },
  "page.commodities.priceHistoryDate": {
    message: "تاریخ",
    description: "عنوان ستون تاریخ‌ها",
  },
  "page.commodities.priceHistoryPrice": {
    message: "قیمت ({quote})",
    description: "عنوان ستون قیمت‌ها به ارز مظنه",
  },
};

export default faCommodities;
