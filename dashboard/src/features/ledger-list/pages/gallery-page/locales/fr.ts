export interface TranslationEntry {
  message: string;
  description: string;
}

const frGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.minimumSearchCharacters": {
    message: "Tapez au moins 2 caractères pour rechercher.",
    description:
      "Polite search status when fewer than two characters have been entered",
  },
  "page.gallery.noMatchingLedgers": {
    message: "Aucun grand livre ne correspond à {query}",
    description:
      "Polite status naming the completed search that found no ledgers",
  },
  "page.gallery.ledgersFound_one": {
    message: "{count} grand livre trouvé",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersFound_many": {
    message: "{count} grands livres trouvés",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersFound_other": {
    message: "{count} grands livres trouvés",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersShownMoreAvailable_one": {
    message: "{count} premier grand livre affiché — d’autres sont disponibles",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.ledgersShownMoreAvailable_many": {
    message:
      "{count} premiers grands livres affichés — d’autres sont disponibles",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.ledgersShownMoreAvailable_other": {
    message:
      "{count} premiers grands livres affichés — d’autres sont disponibles",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.showMoreLedgers": {
    message: "Afficher plus de grands livres",
    description: "Button that loads the next page of ledger search results",
  },
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
