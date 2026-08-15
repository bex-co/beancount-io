export interface TranslationEntry {
  message: string;
  description: string;
}

const deErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "Alle Einträge wurden erfolgreich verarbeitet.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "Fehlermeldung",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "Fehler",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "Fehler konnten nicht geladen werden",
    description: "Error title when errors fail to load",
  },
  "page.errors.line": {
    message: "Line",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "Keine Fehler gefunden",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "Unbekannte Datei",
    description: "Text shown when filename is unknown",
  },
};

export default deErrors;
