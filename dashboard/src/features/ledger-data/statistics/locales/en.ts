export interface TranslationEntry {
  message: string;
  description: string;
}

const enStatistics: Record<string, TranslationEntry> = {
  "page.statistics.accountLastEntries": {
    message: "Account Last Entries",
    description: "Title for account last entries section",
  },
  "page.statistics.accountLastEntriesDescription": {
    message: "Last entry date and balance per account ({count})",
    description:
      "Description for account last entries section. {count} is replaced with the number of accounts, {accounts} is replaced with the translated word for accounts.",
  },
  "page.statistics.count": {
    message: "Count",
    description: "Count column or label",
  },
  "page.statistics.entriesCountByType": {
    message: "Entries Count by Type",
    description: "Title for entries count by type section",
  },
  "page.statistics.postingsPerAccountSummary": {
    message: "Postings count per account ({count})",
    description:
      "Postings per Account summary; {count} is the number of accounts listed",
  },
  "page.statistics.entriesByTypeSummary": {
    message: "Entries: {entries} · Types: {types}",
    description:
      "Entries Count by Type summary; {entries} is the total entry count, {types} the number of entry types",
  },
  "page.statistics.entryType": {
    message: "Entry Type",
    description: "Table column header for entry type",
  },
  "page.statistics.error": {
    message: "Error",
    description: "Generic error title",
  },
  "page.statistics.failedToLoadAccountEntries": {
    message: "Failed to load account entries",
    description: "Error message for account entries",
  },
  "page.statistics.failedToLoadEntriesStatistics": {
    message: "Failed to load entries statistics",
    description: "Error message for entries statistics",
  },
  "page.statistics.failedToLoadPostingsData": {
    message: "Failed to load postings data",
    description: "Error message for postings data",
  },
  "page.statistics.lastEntryDate": {
    message: "Last Entry Date",
    description: "Table column header for last entry date",
  },
  "page.statistics.loadingEntryStatistics": {
    message: "Loading entry statistics...",
    description: "Loading message for entry statistics",
  },
  "page.statistics.loadingQueryResults": {
    message: "Loading query results...",
    description: "Loading message for query results",
  },
  "page.statistics.noDataAvailableForQuery": {
    message: "No data available",
    description: "Message when no data available for query",
  },
  "page.statistics.noResultsFromQuery": {
    message: "No results returned from query",
    description: "Message when query returns no results",
  },
  "page.statistics.percentage": {
    message: "Percentage",
    description: "Table column header for percentage",
  },
  "page.statistics.percentageNotApplicable": {
    message: "Not applicable",
    description:
      "Accessible label shown instead of a percentage when the period has no entries",
  },
  "page.statistics.postingsPerAccount": {
    message: "Postings per {account}",
    description:
      "Title for postings per account section. {account} is replaced with the translated word for account.",
  },
  "page.statistics.statistics": {
    message: "Statistics",
    description: "Statistics about the ledger",
  },
};

export default enStatistics;
