export interface TranslationEntry {
  message: string;
  description: string;
}

const enDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "Documents",
    description: "Documents attached to ledger entries",
  },
  "page.documents.filename": {
    message: "Filename",
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
    message: "No documents found in this ledger.",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message: "Add documents to your ledger files to see them here.",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "Tags",
    description: "Table column header for tags",
  },
};

export default enDocuments;
