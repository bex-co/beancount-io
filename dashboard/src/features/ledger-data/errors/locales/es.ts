export interface TranslationEntry {
  message: string;
  description: string;
}

const esErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "Todas las entradas se han analizado correctamente.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "Mensaje de Error",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "Errores",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "Error al Cargar Errores",
    description: "Error title when errors fail to load",
  },
  "page.errors.line": {
    message: "Line",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "No se Encontraron Errores",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "Archivo desconocido",
    description: "Text shown when filename is unknown",
  },
};

export default esErrors;
