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
    message: "Галерея книг",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "Відкривайте та переглядайте всі доступні книги. Шукайте за назвою, щоб швидко знайти потрібну книгу та перейти до неї.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "Книги не знайдено",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "Шукайте книги та переходьте до них. Введіть щонайменше 2 символи для пошуку.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message: "Спробуйте змінити пошуковий запит, щоб знайти більше книг.",
    description: "Suggestion to adjust search query",
  },
};

export default ukGalleryPage;
