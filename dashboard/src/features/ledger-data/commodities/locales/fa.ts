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
    message: "تاریخچه قیمتی یافت نشد",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "در این دفتر هیچ قیمتی ثبت نشده است، بنابراین تاریخچه‌ای از نرخ تبدیل برای نمایش وجود ندارد.",
    description:
      "Empty state description when the ledger records no commodity prices",
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
  "page.commodities.managedSources": {
    message: "منابع قیمت مدیریت‌شده",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "قیمت‌هایی که این دفتر از یک منبع مدیریت‌شده دریافت می‌کند. هر چند دقیقه به‌روزرسانی می‌شوند؛ ورودی‌های قیمت خودتان اولویت دارند.",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "به‌روز",
    description:
      "Freshness badge: the managed feed was observed within the last ten minutes",
  },
  "page.commodities.freshness.stale": {
    message: "قدیمی",
    description:
      "Freshness badge: the managed feed's latest price is older than ten minutes",
  },
  "page.commodities.freshness.unavailable": {
    message: "در دسترس نیست",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.observedAt": {
    message: "مشاهده‌شده {time}",
    description:
      "When the feed's latest price was observed. {time} is a formatted date and time.",
  },
  "page.commodities.nextRefreshAt": {
    message: "به‌روزرسانی بعدی {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "هنوز قیمتی دریافت نشده است",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "آخرین خطا: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "به‌روزرسانی قیمت‌ها",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "در حال به‌روزرسانی…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "به‌روزرسانی قیمت‌ها ممکن نشد",
    description: "Toast shown when refreshing managed prices fails",
  },
};

export default faCommodities;
