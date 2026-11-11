export interface TranslationEntry {
  message: string;
  description: string;
}

const koGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.minimumSearchCharacters": {
    message: "검색하려면 2자 이상 입력하세요.",
    description:
      "Polite search status when fewer than two characters have been entered",
  },
  "page.gallery.noMatchingLedgers": {
    message: "검색어 {query}에 맞는 장부가 없습니다",
    description:
      "Polite status naming the completed search that found no ledgers",
  },
  "page.gallery.ledgersFound_other": {
    message: "장부 {count}개를 찾았습니다",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersShownMoreAvailable_other": {
    message: "처음 장부 {count}개를 표시 중입니다. 더 많은 장부가 있습니다",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.showMoreLedgers": {
    message: "장부 더 보기",
    description: "Button that loads the next page of ledger search results",
  },
  "page.gallery.failedToSearchLedgers": {
    message: "장부 검색에 실패했습니다",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "장부 갤러리",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "모든 사용 가능한 장부를 발견하고 탐색하세요. 이름으로 검색하여 빠르게 장부를 찾아 이동하세요.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "장부를 찾을 수 없습니다",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message: "장부를 검색하고 이동합니다. 검색하려면 2자 이상 입력하세요.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message: "더 많은 장부를 찾으려면 검색어를 조정해 보세요.",
    description: "Suggestion to adjust search query",
  },
};

export default koGalleryPage;
