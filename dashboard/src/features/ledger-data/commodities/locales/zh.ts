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
  "page.commodities.showPriceHistory": {
    message: "显示 {pair} 的价格历史",
    description: "展开带日期的价格表的按钮",
  },
  "page.commodities.hidePriceHistory": {
    message: "隐藏 {pair} 的价格历史",
    description: "收起带日期的价格表的按钮",
  },
  "page.commodities.priceHistoryDate": {
    message: "日期",
    description: "价格历史日期列标题",
  },
  "page.commodities.priceHistoryPrice": {
    message: "价格（{quote}）",
    description: "以报价货币计的价格列标题",
  },
};

export default zhCommodities;
