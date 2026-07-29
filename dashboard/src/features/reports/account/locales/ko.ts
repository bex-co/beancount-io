export interface TranslationEntry {
  message: string;
  description: string;
}

const koAccountReport: Record<string, TranslationEntry> = {
  "page.accountReport.accountBalance": {
    message: "계정 잔액",
    description: "Label for account balance section",
  },
  "page.accountReport.accountBalanceDescription": {
    message: "시간에 따른 계정 잔액 변화 모니터링",
    description: "Description for account balance chart",
  },
  "page.accountReport.accountJournal": {
    message: "계정 분개장",
    description: "Label for account journal section",
  },
  "page.accountReport.accountJournalDescription": {
    message: "계정에 영향을 미치는 분개 항목:",
    description: "Description prefix for account journal",
  },
  "page.accountReport.title": {
    message: "계정 보고서",
    description: "Title for account report page",
  },
  "page.accountReport.changesOverTime": {
    message: "시간에 따른 변화",
    description: "Label for changes over time section",
  },
  "page.accountReport.changesOverTimeDescription": {
    message: "시간에 따른 계정 변화 보기",
    description: "Description for changes over time chart",
  },
  "page.accountReport.errorLoading": {
    message: "계정 데이터 불러오기 오류",
    description: "Error message for account data",
  },
  "page.accountReport.errorLoadingJournal": {
    message: "분개 데이터 불러오기 오류",
    description: "Error message for account journal data",
  },
  "page.accountReport.loading": {
    message: "계정 데이터 불러오는 중...",
    description: "Loading message for account data",
  },
  "page.accountReport.noData": {
    message: "이 계정의 계정 데이터를 찾을 수 없습니다.",
    description: "Empty state message for account data",
  },
  "page.accountReport.noJournalEntries": {
    message: "분개 항목 없음",
    description: "Heading when no journal entries exist",
  },
  "page.accountReport.noJournalEntriesForAccount": {
    message: "이 계정의 분개 항목을 찾을 수 없습니다.",
    description: "Message when no journal entries exist for account",
  },
};

export default koAccountReport;
