export interface TranslationEntry {
  message: string;
  description: string;
}

const deGalleryPage: Record<string, TranslationEntry> = {
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
