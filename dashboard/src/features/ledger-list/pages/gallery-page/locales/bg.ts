export interface TranslationEntry {
  message: string;
  description: string;
}

const bgGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.minimumSearchCharacters": {
    message: "Въведете поне 2 символа за търсене.",
    description:
      "Polite search status when fewer than two characters have been entered",
  },
  "page.gallery.noMatchingLedgers": {
    message: "Няма книги, съответстващи на {query}",
    description:
      "Polite status naming the completed search that found no ledgers",
  },
  "page.gallery.ledgersFound_one": {
    message: "Намерена е {count} книга",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersFound_other": {
    message: "Намерени са {count} книги",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersShownMoreAvailable_one": {
    message: "Показана е първата {count} книга — има още",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.ledgersShownMoreAvailable_other": {
    message: "Показани са първите {count} книги — има още",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.showMoreLedgers": {
    message: "Покажи още книги",
    description: "Button that loads the next page of ledger search results",
  },
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
