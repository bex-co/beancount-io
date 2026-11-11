export interface TranslationEntry {
  message: string;
  description: string;
}

const enGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.minimumSearchCharacters": {
    message: "Type at least 2 characters to search.",
    description:
      "Polite search status when fewer than two characters have been entered",
  },
  "page.gallery.noMatchingLedgers": {
    message: "No ledgers match {query}",
    description:
      "Polite status naming the completed search that found no ledgers",
  },
  "page.gallery.ledgersFound_one": {
    message: "{count} ledger found",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersFound_other": {
    message: "{count} ledgers found",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersShownMoreAvailable_one": {
    message: "Showing the first {count} ledger — more available",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.ledgersShownMoreAvailable_other": {
    message: "Showing the first {count} ledgers — more available",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.showMoreLedgers": {
    message: "Show more ledgers",
    description: "Button that loads the next page of ledger search results",
  },
  "page.gallery.failedToSearchLedgers": {
    message: "Failed to search ledgers",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "Ledger Gallery",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "Discover and explore all available ledgers. Search by name to quickly find and navigate to any ledger.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "No ledgers found",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "Search for ledgers and navigate to them. Type at least 2 characters to search.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message: "Try adjusting your search query to find more ledgers.",
    description: "Suggestion to adjust search query",
  },
};

export default enGalleryPage;
