export interface TranslationEntry {
  message: string;
  description: string;
}

const ukDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "Вocuments",
    description: "Documents attached to ledger entries",
  },
  "page.documents.filename": {
    message: "Файлname",
    description: "Table column header for filename",
  },
  "page.documents.links": {
    message: "Links",
    description: "Table column header for links",
  },
  "page.documents.meta": {
    message: "Метадані",
    description: "Table column header for metadata",
  },
  "page.documents.noDocumentsFound": {
    message: "У цій книзі не знайдено документів.",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message: "Додайте документи до файлів вашої книги, щоб побачити їх тут.",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "Tags",
    description: "Table column header for tags",
  },
};

export default ukDocuments;
