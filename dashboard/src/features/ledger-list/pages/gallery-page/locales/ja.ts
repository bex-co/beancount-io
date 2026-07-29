export interface TranslationEntry {
  message: string;
  description: string;
}

const jaGalleryPage: Record<string, TranslationEntry> = {
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
