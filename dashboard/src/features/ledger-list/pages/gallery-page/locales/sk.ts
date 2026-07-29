export interface TranslationEntry {
  message: string;
  description: string;
}

const skGalleryPage: Record<string, TranslationEntry> = {
  "page.gallery.failedToSearchLedgers": {
    message: "Vyhľadávanie kníh zlyhalo",
    description: "Error message when search fails",
  },
  "page.gallery.ledgerGallery": {
    message: "Galéria kníh",
    description: "Title for gallery page",
  },
  "page.gallery.ledgerGalleryDescription": {
    message:
      "Objavte a preskúmajte všetky dostupné knihy. Vyhľadávajte podľa názvu pre rýchle nájdenie a navigáciu k akejkoľvek knihe.",
    description: "Description for gallery page",
  },
  "page.gallery.noLedgersFound": {
    message: "Žiadne knihy neboli nájdené",
    description: "Message when user has no ledgers",
  },
  "page.gallery.searchLedgersPlaceholder": {
    message:
      "Vyhľadajte knihy a navigujte k nim. Zadajte aspoň 2 znaky pre vyhľadávanie.",
    description: "Placeholder for ledger search input",
  },
  "page.gallery.tryAdjustingSearchQuery": {
    message: "Skúste upraviť vyhľadávací dotaz pre nájdenie viacerých kníh.",
    description: "Suggestion to adjust search query",
  },
};

export default skGalleryPage;
