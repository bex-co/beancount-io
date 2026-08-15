export interface TranslationEntry {
  message: string;
  description: string;
}

const skDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "Dokumenty",
    description: "Documents attached to ledger entries",
  },
  "page.documents.filename": {
    message: "Názov súboru",
    description: "Table column header for filename",
  },
  "page.documents.links": {
    message: "Links",
    description: "Table column header for links",
  },
  "page.documents.meta": {
    message: "Metadáta",
    description: "Table column header for metadata",
  },
  "page.documents.noDocumentsFound": {
    message: "V tejto knihe neboli nájdené žiadne dokumenty.",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message:
      "Pridajte dokumenty do súborov vašej knihy, aby ste ich tu videli.",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "Tags",
    description: "Table column header for tags",
  },
};

export default skDocuments;
