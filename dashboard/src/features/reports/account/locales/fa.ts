export interface TranslationEntry {
  message: string;
  description: string;
}

const faAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "مانده حساب",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "نظارت بر روند مانده حساب در طول زمان",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "دفتر روزنامه حساب",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "ثبت‌های دفتر روزنامه مؤثر بر حساب:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "گزارش حساب",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "تغییرات در طول زمان",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "مشاهده تغییرات حساب در طول زمان",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "خطا در بارگذاری داده‌های حساب",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "خطا در بارگذاری داده‌های دفتر روزنامه",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "در حال بارگذاری داده‌های حساب...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "هیچ داده حسابی برای این حساب یافت نشد.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "ثبت دفتر روزنامه‌ای وجود ندارد",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "هیچ ثبت دفتر روزنامه‌ای برای این حساب یافت نشد.",
    description: "Message when no journal entries exist for account",
  },
};

export default faAccountReport;
