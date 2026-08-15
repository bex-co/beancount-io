export interface TranslationEntry {
  message: string;
  description: string;
}

const caErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "All entries have been parsed successfully.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "Error Message",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "Errors",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "No s'han pogut carregar els errors",
    description: "Error title when errors fail to load",
  },
  "page.errors.line": {
    message: "Line",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "Dades no disponibles",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "Cercar esdeveniments...",
    description: "Text shown when filename is unknown",
  },
};

export default caErrors;
