export interface TranslationEntry {
  message: string;
  description: string;
}

const faBql: Record<string, TranslationEntry> = {
  "bql.executeQuery": {
    message: "اجرای پرسمان",
    description: "Button text to execute query",
  },
  "bql.executing": {
    message: "در حال اجرا...",
    description: "Button text when query is executing",
  },
  "bql.queryExecutionError": {
    message: "خطایی در هنگام اجرای پرسمان رخ داد",
    description: "Generic error message for query execution",
  },
  "bql.queryResults": {
    message: "نتایج پرسمان",
    description: "Section title for query results",
  },
  "bql.queryShortcutHint": {
    message:
      "برای اجرای پرسمان Cmd+Enter (مک) یا Ctrl+Enter (ویندوز/لینوکس) را فشار دهید",
    description: "Hint text for query keyboard shortcut",
  },
  "bql.queryHistory": {
    message: "تاریخچه پرسمان‌ها",
    description: "Section title for query history",
  },
  "bql.downloadCSV": {
    message: "دانلود CSV",
    description: "Button text to download query results as CSV",
  },
  "bql.noQueryHistory": {
    message:
      "هنوز پرسمانی اجرا نشده است. برای شروع پرسمانی را در بالا وارد کنید.",
    description: "Empty state message when no queries have been executed",
  },
  "bql.deleteQuery": {
    message: "حذف پرسمان",
    description: "Button text to delete a query from history",
  },
  "bql.rowCount": {
    message: "{count} ردیف",
    description: "Row count for large query results",
  },
  "page.bql.query": {
    message: "پرس‌وجو",
    description: "Sidebar navigation label for the BQL query page",
  },
  "page.bql.queryResult": {
    message: "نتیجه پرس‌وجو",
    description: "Label for a query result section header",
  },
  "page.bql.unknownResultType": {
    message: "نوع نتیجه نامشخص",
    description: "Message when query result type is not recognized",
  },
  "page.bql.noDataReturnedFromQuery": {
    message: "پرس‌وجو هیچ داده‌ای برنگرداند",
    description: "Message when a query returns no data",
  },
};

export default faBql;
