export interface TranslationEntry {
  message: string;
  description: string;
}

const faErrors: Record<string, TranslationEntry> = {
  "page.errors.allEntriesParsedSuccessfully": {
    message: "تمام ثبت‌ها با موفقیت تجزیه شده‌اند.",
    description: "Empty state description for no errors",
  },
  "page.errors.errorMessage": {
    message: "پیام خطا",
    description: "Table column header for error message",
  },
  "page.errors.errors": {
    message: "خطاها",
    description: "Errors in ledger file parsing",
  },
  "page.errors.failedToLoadErrors": {
    message: "بارگذاری خطاها ناموفق بود",
    description: "Error title when errors fail to load",
  },
  "page.errors.line": {
    message: "Line",
    description: "Table column header for line number",
  },
  "page.errors.noErrorsFound": {
    message: "خطایی یافت نشد",
    description: "Empty state title when no errors exist",
  },
  "page.errors.unknownFile": {
    message: "فایل نامشخص",
    description: "Text shown when filename is unknown",
  },
};

export default faErrors;
