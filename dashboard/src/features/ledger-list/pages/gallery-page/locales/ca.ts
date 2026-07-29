export interface TranslationEntry {
  message: string;
  description: string;
}

const caGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.failedToSearchLedgers": {
    message: "Error en cercar els llibres",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "Galeria de llibres",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "Descobreix i explora tots els llibres disponibles. Cerca per nom per trobar i navegar ràpidament a qualsevol llibre.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "No s'han trobat llibres",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "Cerqueu llibres i navegueu-hi. Escriviu almenys 2 caràcters per cercar.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message: "Proveu d'ajustar la consulta de cerca per trobar més llibres.",
    description: "Suggestion to adjust search query",
  },
};

export default caGalleryPage;
