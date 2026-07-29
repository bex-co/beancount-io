export interface TranslationEntry {
  message: string;
  description: string;
}

const zhGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.failedToSearchLedgers": {
    message: "搜索账本失败",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "账本库",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message: "发现和浏览所有可用的账本。按名称搜索以快速找到并导航到任何账本。",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "未找到账本",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message: "搜索账本并导航到它们。至少输入2个字符以开始搜索。",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message: "尝试调整你的搜索查询以找到更多账本。",
    description: "Suggestion to adjust search query",
  },
};

export default zhGalleryPage;
