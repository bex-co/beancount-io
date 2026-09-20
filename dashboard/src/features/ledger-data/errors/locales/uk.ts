export interface TranslationEntry {
  message: string;
  description: string;
}

const ukErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "Всі записи успішно розібрано.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "Повідомлення про помилку",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "Помилки",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "Не вдалося завантажити помилки",
    description: "Error title when errors fail to load",
  },
  "page.errors.line": {
    message: "Рядок",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "Помилок не знайдено",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "Невідомий файл",
    description: "Text shown when filename is unknown",
  },
};

export default ukErrors;
