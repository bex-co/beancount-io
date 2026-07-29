export interface TranslationEntry {
  message: string;
  description: string;
}

const jaDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "ドキュメント",
    description: "Documents attached to ledger entries",
  },
  "page.documents.failedToLoadDocuments": {
    message: "ドキュメントの読み込みに失敗しました",
    description: "Error message when documents fail to load",
  },
  "page.documents.filename": {
    message: "ファイル名",
    description: "Table column header for filename",
  },
  "page.documents.links": {
    message: "リンク",
    description: "Table column header for links",
  },
  "page.documents.meta": {
    message: "メタ",
    description: "Table column header for metadata",
  },
  "page.documents.noDocumentsFound": {
    message: "この元帳にドキュメントが見つかりません。",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message: "元帳ファイルにドキュメントを追加するとここに表示されます。",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "タグ",
    description: "Table column header for tags",
  },
};

export default jaDocuments;
