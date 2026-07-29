export interface TranslationEntry {
  message: string;
  description: string;
}

const bgErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "Всички записи са разчетени успешно.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "Съобщение за грешка",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "Грешки",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "Неуспешно зареждане на грешките",
    description: "Error title when errors fail to load",
  },
  "page.errors.failedToLoadErrorsDescription": {
    message:
      "Възникна грешка при зареждането на данните за грешките. Моля, опитайте отново по-късно.",
    description: "Error description when errors fail to load",
  },
  "page.errors.line": {
    message: "Line",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "Няма намерени грешки",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "Неизвестен файл",
    description: "Text shown when filename is unknown",
  },
};

export default bgErrors;
