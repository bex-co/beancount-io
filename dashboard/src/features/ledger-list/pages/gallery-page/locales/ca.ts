export interface TranslationEntry {
  message: string;
  description: string;
}

const caGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.minimumSearchCharacters": {
    message: "Escriviu almenys 2 caràcters per cercar.",
    description:
      "Polite search status when fewer than two characters have been entered",
  },
  "page.gallery.noMatchingLedgers": {
    message: "Cap llibre coincideix amb {query}",
    description:
      "Polite status naming the completed search that found no ledgers",
  },
  "page.gallery.ledgersFound_one": {
    message: "S’ha trobat {count} llibre",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersFound_many": {
    message: "S’han trobat {count} llibres",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersFound_other": {
    message: "S’han trobat {count} llibres",
    description:
      "Polite status announcing the number of ledgers found by the completed search",
  },
  "page.gallery.ledgersShownMoreAvailable_one": {
    message: "Es mostra el primer {count} llibre; n’hi ha més",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.ledgersShownMoreAvailable_many": {
    message: "Es mostren els primers {count} llibres; n’hi ha més",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.ledgersShownMoreAvailable_other": {
    message: "Es mostren els primers {count} llibres; n’hi ha més",
    description:
      "Polite status when the search shows its first loaded pages and more matching ledgers exist",
  },
  "page.gallery.showMoreLedgers": {
    message: "Mostra més llibres",
    description: "Button that loads the next page of ledger search results",
  },
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
