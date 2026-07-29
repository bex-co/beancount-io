export interface TranslationEntry {
  message: string;
  description: string;
}

const bgDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "Документи",
    description: "Documents attached to ledger entries",
  },
  "page.documents.failedToLoadDocuments": {
    message: "Неуспешно зареждане на документи",
    description: "Error message when documents fail to load",
  },
  "page.documents.filename": {
    message: "Име на файл",
    description: "Table column header for filename",
  },
  "page.documents.links": {
    message: "Links",
    description: "Table column header for links",
  },
  "page.documents.meta": {
    message: "Мета",
    description: "Table column header for metadata",
  },
  "page.documents.noDocumentsFound": {
    message: "Няма намерени документи в тази книга.",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message:
      "Добавете документи към файловете на книгата, за да ги видите тук.",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "Tags",
    description: "Table column header for tags",
  },
};

export default bgDocuments;
