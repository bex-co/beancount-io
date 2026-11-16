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
    message: "未找到价格历史",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "该账本没有记录任何价格，因此没有可显示的汇率历史。",
    description:
      "Empty state description when the ledger records no commodity prices",
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
  "page.commodities.managedSources": {
    message: "托管价格来源",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "此账本从托管数据源引入的价格。每隔几分钟刷新一次；你自己录入的价格优先。",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "最新",
    description:
      "Freshness badge: the managed feed's newest price is at most seven days old",
  },
  "page.commodities.freshness.stale": {
    message: "已过时",
    description:
      "Freshness badge: the managed feed's newest price is more than seven days old",
  },
  "page.commodities.freshness.unavailable": {
    message: "不可用",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.latestPriceDate": {
    message: "最新价格 {date}",
    description:
      "Date of the managed feed's newest price. {date} is a formatted date.",
  },
  "page.commodities.nextRefreshAt": {
    message: "下次刷新 {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "尚未收到价格",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "最近错误：{error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "刷新价格",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "正在刷新…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "无法刷新价格",
    description: "Toast shown when refreshing managed prices fails",
  },
  "page.commodities.chartsReloadFailed": {
    message: "价格已刷新，但图表未能重新加载。",
    description:
      "Shown on the managed price sources card when a refresh was acknowledged but reading the price charts again failed",
  },
  "page.commodities.reloadCharts": {
    message: "重新加载图表",
    description:
      "Button that reads the price charts again after a failed reload, without refreshing the managed feeds",
  },
};

export default zhCommodities;
