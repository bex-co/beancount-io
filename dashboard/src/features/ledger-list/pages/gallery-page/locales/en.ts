export interface TranslationEntry {
  message: string;
  description: string;
}

const enGalleryPage: Record<string, TranslationEntry> = {
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
