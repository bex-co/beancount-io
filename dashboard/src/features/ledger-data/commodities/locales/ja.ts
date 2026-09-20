export interface TranslationEntry {
  message: string;
  description: string;
}

const jaCommodities: Record<string, TranslationEntry> = {
  "page.commodities.commodities": {
    message: "商品",
    description: "Commodities/currencies view in ledger",
  },
  "page.commodities.failedToLoadCommodities": {
    message: "商品の読み込みに失敗しました",
    description: "Error title when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "価格履歴が見つかりません",
    description:
      "Empty state title when the ledger records no commodity prices",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message:
      "この帳簿には価格の記録がないため、表示できる為替レートの履歴はありません。",
    description:
      "Empty state description when the ledger records no commodity prices",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "{count}データポイントの価格履歴",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
  "page.commodities.showPriceHistory": {
    message: "{pair} の価格履歴を表示",
    description: "日付付き価格表を開くボタン",
  },
  "page.commodities.hidePriceHistory": {
    message: "{pair} の価格履歴を隠す",
    description: "日付付き価格表を閉じるボタン",
  },
  "page.commodities.priceHistoryDate": {
    message: "日付",
    description: "価格履歴の日付列見出し",
  },
  "page.commodities.priceHistoryPrice": {
    message: "価格（{quote}）",
    description: "建値通貨での価格列見出し",
  },
};

export default jaCommodities;
