export interface TranslationEntry {
  message: string;
  description: string;
}

const faDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "اسناد",
    description: "Documents attached to ledger entries",
  },
  "page.documents.failedToLoadDocuments": {
    message: "بارگذاری اسناد ناموفق بود",
    description: "Error message when documents fail to load",
  },
  "page.documents.filename": {
    message: "نام فایل",
    description: "Table column header for filename",
  },
  "page.documents.links": {
    message: "Links",
    description: "Table column header for links",
  },
  "page.documents.meta": {
    message: "فراداده",
    description: "Table column header for metadata",
  },
  "page.documents.noDocumentsFound": {
    message: "هیچ سندی در این دفتر یافت نشد.",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message:
      "اسناد را به فایل‌های دفتر خود اضافه کنید تا اینجا نمایش داده شوند.",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "Tags",
    description: "Table column header for tags",
  },
};

export default faDocuments;
