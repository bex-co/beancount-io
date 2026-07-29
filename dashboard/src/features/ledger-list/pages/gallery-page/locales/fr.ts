export interface TranslationEntry {
  message: string;
  description: string;
}

const frGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.failedToSearchLedgers": {
    message: "Échec de la recherche de grands livres",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "Galerie de grands livres",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "Découvrez et explorez tous les grands livres disponibles. Recherchez par nom pour trouver et accéder rapidement à n'importe quel grand livre.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "Aucun grand livre trouvé",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "Recherchez des grands livres et accédez-y. Tapez au moins 2 caractères pour rechercher.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message:
      "Essayez d'ajuster votre requête de recherche pour trouver plus de grands livres.",
    description: "Suggestion to adjust search query",
  },
};

export default frGalleryPage;
