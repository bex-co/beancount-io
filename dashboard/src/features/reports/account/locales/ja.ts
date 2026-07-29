export interface TranslationEntry {
  message: string;
  description: string;
}

const jaAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "口座残高",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "時系列での口座残高の推移を監視",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "口座仕訳帳",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "口座に影響する仕訳エントリ:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "口座レポート",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "時系列の変化",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "時系列での口座の変化を表示",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "口座データの読み込みエラー",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "仕訳データの読み込みエラー",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "口座データを読み込み中...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "この口座の口座データが見つかりません。",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "仕訳エントリがありません",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "この口座の仕訳エントリが見つかりません。",
    description: "Message when no journal entries exist for account",
  },
};

export default jaAccountReport;
