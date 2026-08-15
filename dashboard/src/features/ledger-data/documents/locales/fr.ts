export interface TranslationEntry {
  message: string;
  description: string;
}

const frDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "Documents",
    description: "Documents attached to ledger entries",
  },
  "page.documents.filename": {
    message: "Nom de fichier",
    description: "Table column header for filename",
  },
  "page.documents.links": {
    message: "Links",
    description: "Table column header for links",
  },
  "page.documents.meta": {
    message: "Méta",
    description: "Table column header for metadata",
  },
  "page.documents.noDocumentsFound": {
    message: "Aucun document trouvé dans ce grand livre.",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message:
      "Ajoutez des documents à vos fichiers de grand livre pour les voir ici.",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "Tags",
    description: "Table column header for tags",
  },
};

export default frDocuments;
