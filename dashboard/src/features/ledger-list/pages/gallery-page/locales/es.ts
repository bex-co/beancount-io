export interface TranslationEntry {
  message: string;
  description: string;
}

const esGalleryPage: Record<string, TranslationEntry> = {
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
