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
  "page.commodities.failedToLoadCommoditiesDescription": {
    message:
      "商品データの読み込み中にエラーが発生しました。後でもう一度お試しください。",
    description: "Error description when commodities fail to load",
  },
  "page.commodities.noCommoditiesFound": {
    message: "商品が見つかりません",
    description: "Empty state title when no commodities exist",
  },
  "page.commodities.noCommoditiesFoundDescription": {
    message: "この元帳にはまだ商品価格データがありません。",
    description: "Empty state description for no commodities",
  },
  "page.commodities.priceHistoryDataPoints": {
    message: "{count}データポイントの価格履歴",
    description:
      "Description showing number of price data points. {count} is replaced with the number of data points.",
  },
};

export default jaCommodities;
