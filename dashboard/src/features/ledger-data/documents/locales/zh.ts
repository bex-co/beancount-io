export interface TranslationEntry {
  message: string;
  description: string;
}

const zhDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "文档",
    description: "Documents attached to ledger entries",
  },
  "page.documents.filename": {
    message: "文件名",
    description: "Table column header for filename",
  },
  "page.documents.links": {
    message: "Links",
    description: "Table column header for links",
  },
  "page.documents.meta": {
    message: "元数据",
    description: "Table column header for metadata",
  },
  "page.documents.noDocumentsFound": {
    message: "此账本中未找到文档。",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message: "将文档添加到你的账本文件中以在此处查看。",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "Tags",
    description: "Table column header for tags",
  },
};

export default zhDocuments;
