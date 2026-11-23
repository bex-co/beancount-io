export interface TranslationEntry {
  message: string;
  description: string;
}

const caDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "Documents",
    description: "Documents attached to ledger entries",
  },
  "page.documents.filename": {
    message: "Nom del fitxer",
    description: "Table column header for filename",
  },
  "page.documents.links": {
    message: "Enllaços",
    description: "Table column header for links",
  },
  "page.documents.meta": {
    message: "Meta",
    description: "Table column header for metadata",
  },
  "page.documents.noDocumentsFound": {
    message: "No s'ha trobat cap document en aquest llibre.",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message:
      "Afegiu documents als fitxers del vostre llibre per veure'ls aquí.",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "Etiquetes",
    description: "Table column header for tags",
  },
};

export default caDocuments;
