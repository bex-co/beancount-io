export interface TranslationEntry {
  message: string;
  description: string;
}

const nlGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.failedToSearchLedgers": {
    message: "Grootboeken zoeken mislukt",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "Grootboek galerij",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "Ontdek en verken alle beschikbare grootboeken. Zoek op naam om snel grootboeken te vinden en te openen.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "Geen grootboeken gevonden",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "Zoek naar grootboeken en navigeer ernaar. Typ minimaal 2 tekens om te zoeken.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message: "Pas uw zoekopdracht aan om meer grootboeken te vinden.",
    description: "Suggestion to adjust search query",
  },
};

export default nlGalleryPage;
