export interface TranslationEntry {
  message: string;
  description: string;
}

const skErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "Všetky záznamy boli úspešne spracované.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "Chybová správa",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "Chyby",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "Nepodarilo sa načítať chyby",
    description: "Error title when errors fail to load",
  },
  "page.errors.line": {
    message: "Line",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "Nenašli sa žiadne chyby",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "Neznámy súbor",
    description: "Text shown when filename is unknown",
  },
};

export default skErrors;
