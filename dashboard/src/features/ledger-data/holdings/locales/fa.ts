export interface TranslationEntry {
  message: string;
  description: string;
}

const faHoldings: Record<string, TranslationEntry> = {
  "page.holdings.exportCsv": {
    message: "خروجی CSV",
    description: "Button text to export data as CSV",
  },
  "page.holdings.holdings": {
    message: "دارایی‌های نگهداری شده",
    description: "Holdings/investments view in ledger",
  },
  "page.holdings.holdingsByAccount": {
    message: "دارایی‌ها بر اساس حساب",
    description: "Tab label for holdings grouped by account",
  },
  "page.holdings.holdingsByCostCurrency": {
    message: "دارایی‌ها بر اساس ارز بهای تمام شده",
    description: "Tab label for holdings grouped by cost currency",
  },
  "page.holdings.holdingsByCurrency": {
    message: "دارایی‌ها بر اساس ارز",
    description: "Tab label for holdings grouped by currency",
  },
  "page.holdings.noDataReturnedFromQuery": {
    message: "پرس‌وجو هیچ داده‌ای برنگرداند",
    description: "Message when query returns empty result",
  },
  "page.holdings.noQueryResultsAvailable": {
    message: "نتیجه پرس‌وجویی موجود نیست",
    description: "Message when no query results exist",
  },
  "page.holdings.queryResult": {
    message: "نتیجه پرس‌وجو",
    description: "Section title for query result",
  },
  "page.holdings.row": {
    message: "ردیف",
    description: "Singular form for row count",
  },
  "page.holdings.unknownResultType": {
    message: "نوع نتیجه نامشخص",
    description: "Error message for unrecognized result type",
  },
};

export default faHoldings;
