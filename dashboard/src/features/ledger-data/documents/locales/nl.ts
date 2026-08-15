export interface TranslationEntry {
  message: string;
  description: string;
}

const nlDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "Documenten",
    description: "Documents attached to ledger entries",
  },
  "page.documents.filename": {
    message: "Bestandsnaam",
    description: "Table column header for filename",
  },
  "page.documents.links": {
    message: "Links",
    description: "Table column header for links",
  },
  "page.documents.meta": {
    message: "Meta",
    description: "Table column header for metadata",
  },
  "page.documents.noDocumentsFound": {
    message: "Geen documenten gevonden in dit grootboek.",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message:
      "Voeg documenten toe aan uw grootboekbestanden om ze hier te zien.",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "Tags",
    description: "Table column header for tags",
  },
};

export default nlDocuments;
