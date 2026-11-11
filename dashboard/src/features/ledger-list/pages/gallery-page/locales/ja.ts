export interface TranslationEntry {
  message: string;
  description: string;
}

const jaGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.minimumSearchCharacters": {
    message: "検索するには2文字以上入力してください。",
    description:
      "Polite search status when fewer than two characters have been entered",
  },
  "page.gallery.noMatchingLedgers": {
    message: "{query} に一致する台帳はありません",
    description:
      "Polite status naming the completed search that found no ledgers",
  },
  "page.gallery.ledgersFound_other": {
    message: "{count} 件の台帳が見つかりました",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersShownMoreAvailable_other": {
    message: "最初の {count} 件の台帳を表示中。さらに台帳があります",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.showMoreLedgers": {
    message: "さらに台帳を表示",
    description: "Button that loads the next page of ledger search results",
  },
  "page.gallery.failedToSearchLedgers": {
    message: "台帳の検索に失敗しました",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "台帳ギャラリー",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "利用可能なすべての台帳を発見して探索します。名前で検索してすばやく任意の台帳を見つけてナビゲートします。",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "台帳が見つかりません",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "台帳を検索してナビゲートします。検索するには2文字以上入力してください。",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message: "より多くの台帳を見つけるには検索クエリを調整してください。",
    description: "Suggestion to adjust search query",
  },
};

export default jaGalleryPage;
