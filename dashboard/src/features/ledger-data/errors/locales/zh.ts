export interface TranslationEntry {
  message: string;
  description: string;
}

const zhErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "所有条目都已成功解析。",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "错误 Message",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "错误",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "加载错误失败",
    description: "Error title when errors fail to load",
  },
  "page.errors.line": {
    message: "Line",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "未找到错误",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "未知文件",
    description: "Text shown when filename is unknown",
  },
};

export default zhErrors;
