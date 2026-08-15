export interface TranslationEntry {
  message: string;
  description: string;
}

const nlErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "Alle boekingen zijn succesvol verwerkt.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "Foutmelding",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "Fouten",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "Fouten laden mislukt",
    description: "Error title when errors fail to load",
  },
  "page.errors.line": {
    message: "Line",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "Geen fouten gevonden",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "Onbekend bestand",
    description: "Text shown when filename is unknown",
  },
};

export default nlErrors;
