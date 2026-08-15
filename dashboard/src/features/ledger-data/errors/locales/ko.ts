export interface TranslationEntry {
  message: string;
  description: string;
}

const koErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "모든 항목이 성공적으로 파싱되었습니다.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "오류 메시지",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "오류",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "오류 불러오기 실패",
    description: "Error title when errors fail to load",
  },
  "page.errors.line": {
    message: "줄",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "오류가 없습니다",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "알 수 없는 파일",
    description: "Text shown when filename is unknown",
  },
};

export default koErrors;
