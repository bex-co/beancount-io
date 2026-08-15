export interface TranslationEntry {
  message: string;
  description: string;
}

const frErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "Toutes les écritures ont été analysées avec succès.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "Error Message",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "Erreurs",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "Échec du chargement des erreurs",
    description: "Error title when errors fail to load",
  },
  "page.errors.line": {
    message: "Line",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "Aucune erreur trouvée",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "Fichier inconnu",
    description: "Text shown when filename is unknown",
  },
};

export default frErrors;
