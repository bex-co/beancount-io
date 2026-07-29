export interface TranslationEntry {
  message: string;
  description: string;
}

const faStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "آخرین ثبت‌های حساب",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "تاریخ آخرین ثبت و موجودی برای {count} {accounts}",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "تعداد",
    description: "Count column or label",
  },
  "page.statistics.entriesAcrossTypes": {
    message: "ثبت در",
    description: "Text between total and types count",
  },
  "page.statistics.entriesCountByType": {
    message: "تعداد ثبت‌ها بر اساس نوع",
    description: "Title for entries count by type section",
  },
  "page.statistics.entryCountPerAccount": {
    message: "تعداد ثبت در هر حساب",
    description: "Summary of entry count per account",
  },
  "page.statistics.entryType": {
    message: "نوع ثبت",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "خطا",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "بارگذاری ثبت‌های حساب ناموفق بود",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "بارگذاری آمار ثبت‌ها ناموفق بود",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "بارگذاری داده‌های سندها ناموفق بود",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "تاریخ آخرین ثبت",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "در حال بارگذاری آمار ثبت‌ها...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "در حال بارگذاری نتایج پرس‌وجو...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "داده‌ای موجود نیست",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "پرس‌وجو هیچ نتیجه‌ای برنگرداند",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "درصد",
    description: "Table column header for percentage",
  },
  "page.statistics.postingsPerAccount": {
    message: "سندها بر اساس {account}",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "آمار",
    description: "Statistics about the ledger",
  },
  "page.statistics.total": {
    message: "مجموع",
    description: "Label for total count",
  },
  "page.statistics.types": {
    message: "نوع",
    description: "Label for types count",
  },
};

export default faStatistics;
