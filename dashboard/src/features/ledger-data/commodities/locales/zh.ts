export interface TranslationEntry {
  message: string;
  description: string;
}

const zhCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "商品",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "加载商品失败",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "未找到商品",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "此账本尚无任何商品价格数据。",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "价格历史记录，包含 {count} 个数据点",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
};

export default zhCommodities;
