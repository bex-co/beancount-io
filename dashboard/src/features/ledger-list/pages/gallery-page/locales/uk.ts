export interface TranslationEntry {
  message: string;
  description: string;
}

const ukGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.failedToSearchLedgers": {
    message: "Не вдалося виконати пошук книг",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "Пedger Gallery",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "Вiscover and explore all available ledgers. Search by name to quickly find and navigate to any ledger.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "Книги не знайдено",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "Пошук for ledgers and navigate to them. Type at least 2 characters to search.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message: "Спробуйте змінити пошуковий запит, щоб знайти більше книг.",
    description: "Suggestion to adjust search query",
  },
};

export default ukGalleryPage;
