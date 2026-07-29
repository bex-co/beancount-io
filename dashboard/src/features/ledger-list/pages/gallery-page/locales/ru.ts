export interface TranslationEntry {
  message: string;
  description: string;
}

const ruGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.failedToSearchLedgers": {
    message: "Не удалось выполнить поиск книг",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "Галерея книг",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "Откройте для себя и исследуйте все доступные книги. Используйте поиск по названию для быстрого перехода к любой книге.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "Книги не найдены",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "Найдите книги и перейдите к ним. Введите не менее 2 символов для поиска.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message: "Попробуйте изменить запрос для поиска большего количества книг.",
    description: "Suggestion to adjust search query",
  },
};

export default ruGalleryPage;
