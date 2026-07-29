export interface TranslationEntry {
  message: string;
  description: string;
}

const jaErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "すべてのエントリが正常に解析されました。",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "エラーメッセージ",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "エラー",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "エラーの読み込みに失敗しました",
    description: "Error title when errors fail to load",
  },
  "page.errors.failedToLoadErrorsDescription": {
    message:
      "エラーデータの読み込み中にエラーが発生しました。後でもう一度お試しください。",
    description: "Error description when errors fail to load",
  },
  "page.errors.line": {
    message: "行",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "エラーが見つかりません",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "不明なファイル",
    description: "Text shown when filename is unknown",
  },
};

export default jaErrors;
