export interface TranslationEntry {
  message: string;
  description: string;
}

const deDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "Dokumente",
    description: "Documents attached to ledger entries",
  },
  "page.documents.failedToLoadDocuments": {
    message: "Dokumente konnten nicht geladen werden",
    description: "Error message when documents fail to load",
  },
  "page.documents.filename": {
    message: "Dateiname",
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
    message: "Keine Dokumente in diesem Hauptbuch gefunden.",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message:
      "Fügen Sie Dokumente zu Ihren Hauptbuchdateien hinzu, um sie hier zu sehen.",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "Tags",
    description: "Table column header for tags",
  },
};

export default deDocuments;
