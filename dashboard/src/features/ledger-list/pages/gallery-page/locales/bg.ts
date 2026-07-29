export interface TranslationEntry {
  message: string;
  description: string;
}

const bgGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.failedToSearchLedgers": {
    message: "Неуспешно търсене на книги",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "Галерия на книги",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "Открийте и разгледайте всички налични книги. Търсете по име, за да намерите бързо и да преминете към която и да е книга.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "Няма намерени книги",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "Търсете книги и преминете към тях. Въведете поне 2 символа за търсене.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message:
      "Опитайте да коригирате заявката си за търсене, за да намерите повече книги.",
    description: "Suggestion to adjust search query",
  },
};

export default bgGalleryPage;
