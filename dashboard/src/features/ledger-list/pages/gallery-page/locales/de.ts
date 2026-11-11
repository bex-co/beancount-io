export interface TranslationEntry {
  message: string;
  description: string;
}

const deGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.minimumSearchCharacters": {
    message: "Geben Sie mindestens 2 Zeichen ein, um zu suchen.",
    description:
      "Polite search status when fewer than two characters have been entered",
  },
  "page.gallery.noMatchingLedgers": {
    message: "Keine Hauptbücher entsprechen {query}",
    description:
      "Polite status naming the completed search that found no ledgers",
  },
  "page.gallery.ledgersFound_one": {
    message: "{count} Hauptbuch gefunden",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersFound_other": {
    message: "{count} Hauptbücher gefunden",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersShownMoreAvailable_one": {
    message: "Das erste {count} Hauptbuch wird angezeigt – weitere verfügbar",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.ledgersShownMoreAvailable_other": {
    message:
      "Die ersten {count} Hauptbücher werden angezeigt – weitere verfügbar",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.showMoreLedgers": {
    message: "Weitere Hauptbücher anzeigen",
    description: "Button that loads the next page of ledger search results",
  },
  "page.gallery.failedToSearchLedgers": {
    message: "Hauptbücher konnten nicht durchsucht werden",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "Hauptbuch-Galerie",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "Entdecken und erkunden Sie alle verfügbaren Hauptbücher. Suchen Sie nach Namen, um schnell ein Hauptbuch zu finden und zu öffnen.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "Keine Hauptbücher gefunden",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "Suchen Sie nach Hauptbüchern und navigieren Sie zu ihnen. Geben Sie mindestens 2 Zeichen ein, um zu suchen.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message:
      "Versuchen Sie, Ihre Suchanfrage anzupassen, um weitere Hauptbücher zu finden.",
    description: "Suggestion to adjust search query",
  },
};

export default deGalleryPage;
