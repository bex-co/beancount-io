export interface TranslationEntry {
  message: string;
  description: string;
}

const caErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "Totes les entrades s'han analitzat correctament.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "Missatge d'error",
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
    message: "Línia",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "No s'han trobat errors",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "Fitxer desconegut",
    description: "Text shown when filename is unknown",
  },
};

export default caErrors;
