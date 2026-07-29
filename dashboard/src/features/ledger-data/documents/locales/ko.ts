export interface TranslationEntry {
  message: string;
  description: string;
}

const koDocuments: Record<string, TranslationEntry> = {
  "page.documents.documents": {
    message: "문서",
    description: "Documents attached to ledger entries",
  },
  "page.documents.failedToLoadDocuments": {
    message: "문서 불러오기 실패",
    description: "Error message when documents fail to load",
  },
  "page.documents.filename": {
    message: "파일명",
    description: "Table column header for filename",
  },
  "page.documents.links": {
    message: "링크",
    description: "Table column header for links",
  },
  "page.documents.meta": {
    message: "메타",
    description: "Table column header for metadata",
  },
  "page.documents.noDocumentsFound": {
    message: "이 장부에서 문서를 찾을 수 없습니다.",
    description: "Empty state message for no documents",
  },
  "page.documents.noDocumentsFoundDescription": {
    message: "장부 파일에 문서를 추가하면 여기에 표시됩니다.",
    description: "Empty state description for no documents",
  },
  "page.documents.tags": {
    message: "태그",
    description: "Table column header for tags",
  },
};

export default koDocuments;
