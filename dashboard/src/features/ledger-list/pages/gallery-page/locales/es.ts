export interface TranslationEntry {
  message: string;
  description: string;
}

const esGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.minimumSearchCharacters": {
    message: "Escriba al menos 2 caracteres para buscar.",
    description:
      "Polite search status when fewer than two characters have been entered",
  },
  "page.gallery.noMatchingLedgers": {
    message: "Ningún libro mayor coincide con {query}",
    description:
      "Polite status naming the completed search that found no ledgers",
  },
  "page.gallery.ledgersFound_one": {
    message: "Se encontró {count} libro mayor",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersFound_many": {
    message: "Se encontraron {count} libros mayores",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersFound_other": {
    message: "Se encontraron {count} libros mayores",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersShownMoreAvailable_one": {
    message: "Se muestra el primer {count} libro mayor; hay más",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.ledgersShownMoreAvailable_many": {
    message: "Se muestran los primeros {count} libros mayores; hay más",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.ledgersShownMoreAvailable_other": {
    message: "Se muestran los primeros {count} libros mayores; hay más",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.showMoreLedgers": {
    message: "Mostrar más libros mayores",
    description: "Button that loads the next page of ledger search results",
  },
  "page.gallery.failedToSearchLedgers": {
    message: "Error al buscar libros mayores",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "Galería de Libros Mayores",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "Descubra y explore todos los libros mayores disponibles. Busque por nombre para encontrar rápidamente y navegar a cualquier libro mayor.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "No se encontraron libros mayores",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "Busque libros mayores y navegue a ellos. Escriba al menos 2 caracteres para buscar.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message:
      "Intente ajustar su consulta de búsqueda para encontrar más libros mayores.",
    description: "Suggestion to adjust search query",
  },
};

export default esGalleryPage;
