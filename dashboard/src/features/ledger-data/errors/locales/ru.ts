export interface TranslationEntry {
  message: string;
  description: string;
}

const ruErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "Все записи успешно обработаны.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "Ошибка Message",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "Ошибкаs",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "Не удалось загрузить ошибки",
    description: "Error title when errors fail to load",
  },
  "page.errors.failedToLoadErrorsDescription": {
    message:
      "Произошла ошибка при загрузке данных об ошибках. Пожалуйста, попробуйте позже.",
    description: "Error description when errors fail to load",
  },
  "page.errors.line": {
    message: "Line",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "Ошибки не найдены",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "Неизвестный файл",
    description: "Text shown when filename is unknown",
  },
};

export default ruErrors;
