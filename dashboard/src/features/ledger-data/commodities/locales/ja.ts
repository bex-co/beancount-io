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
  "page.commodities.managedSources": {
    message: "管理された価格ソース",
    description:
      "Title of the panel listing managed price feeds the ledger includes",
  },
  "page.commodities.managedSourcesDescription": {
    message:
      "この元帳が管理されたフィードから取り込む価格です。数分ごとに更新され、ご自身の価格エントリが優先されます。",
    description: "Description of the managed price sources panel",
  },
  "page.commodities.freshness.recent": {
    message: "最新",
    description:
      "Freshness badge: the managed feed was observed within the last ten minutes",
  },
  "page.commodities.freshness.stale": {
    message: "古い",
    description:
      "Freshness badge: the managed feed's latest price is older than ten minutes",
  },
  "page.commodities.freshness.unavailable": {
    message: "利用不可",
    description:
      "Freshness badge: no valid price has been received from the managed feed",
  },
  "page.commodities.observedAt": {
    message: "観測日時 {time}",
    description:
      "When the feed's latest price was observed. {time} is a formatted date and time.",
  },
  "page.commodities.nextRefreshAt": {
    message: "次回更新 {time}",
    description:
      "When the feed will next be re-fetched. {time} is a formatted date and time.",
  },
  "page.commodities.neverObserved": {
    message: "まだ価格を受信していません",
    description: "Shown when a managed feed has never delivered a valid price",
  },
  "page.commodities.lastError": {
    message: "最後のエラー: {error}",
    description:
      "Why the last refresh of a managed feed failed. {error} is the technical cause.",
  },
  "page.commodities.refreshPrices": {
    message: "価格を更新",
    description: "Button that re-fetches the ledger's managed price feeds now",
  },
  "page.commodities.refreshingPrices": {
    message: "更新中…",
    description: "Refresh button label while the refresh is in progress",
  },
  "page.commodities.refreshPricesFailed": {
    message: "価格を更新できませんでした",
    description: "Toast shown when refreshing managed prices fails",
  },
};

export default jaCommodities;
