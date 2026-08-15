export interface TranslationEntry {
  message: string;
  description: string;
}

const ruDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "Документs",
    description: "Documents attached to ledger entries",
  },
  "page.documents.filename": {
    message: "Имя файла",
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
    message: "Документы не найдены in this ledger.",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message: "Добавьте документы в файлы вашей книги, чтобы увидеть их здесь.",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "Tags",
    description: "Table column header for tags",
  },
};

export default ruDocuments;
