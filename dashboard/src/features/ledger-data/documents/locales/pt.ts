export interface TranslationEntry {
  message: string;
  description: string;
}

const ptDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "Documentos",
    description: "Documents attached to ledger entries",
  },
  "page.documents.filename": {
    message: "Nome do Arquivo",
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
    message: "Nenhum documento encontrado neste livro-razão.",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message:
      "Adicione documentos aos seus arquivos de livro-razão para vê-los aqui.",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "Tags",
    description: "Table column header for tags",
  },
};

export default ptDocuments;
