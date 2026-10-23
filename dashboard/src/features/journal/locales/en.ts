export interface TranslationEntry {
  message: string;
  description: string;
}

const enJournal: Record<string, TranslationEntry> = {
  "journal.openEntryWithContext": {
    message: "Open entry {entry} (row {position})",
    description:
      "Accessible name for opening Entry Context, including the entry identity and row position",
  },
  "journal.showEntryPostings_one": {
    message: "Show {count} posting for {entry} (row {position})",
    description:
      "Accessible name for revealing this row's postings, including their count and entry identity",
  },
  "journal.showEntryPostings_other": {
    message: "Show {count} postings for {entry} (row {position})",
    description:
      "Accessible name for revealing this row's postings, including their count and entry identity",
  },
  "journal.hideEntryPostings_one": {
    message: "Hide {count} posting for {entry} (row {position})",
    description:
      "Accessible name for hiding this row's postings, including their count and entry identity",
  },
  "journal.hideEntryPostings_other": {
    message: "Hide {count} postings for {entry} (row {position})",
    description:
      "Accessible name for hiding this row's postings, including their count and entry identity",
  },
  "journal.visibleEntryPostings_one": {
    message: "{count} posting shown for {entry} (row {position})",
    description:
      "Accessible name for the static posting count when all rows are forced open",
  },
  "journal.visibleEntryPostings_other": {
    message: "{count} postings shown for {entry} (row {position})",
    description:
      "Accessible name for the static posting count when all rows are forced open",
  },
  "journal.account": {
    message: "Account",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "Account (e.g., Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Account is required",
    description: "Validation error when account is missing",
  },
  "journal.addNewJournalEntry": {
    message: "Add new journal entry",
    description: "Aria label for add new journal entry button",
  },
  "journal.amountMustBeNumber": {
    message: "Amount must be a valid number",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "Amount (e.g., 100.00)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "Amount is required",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastTwoPostings": {
    message: "At least two postings are required",
    description: "Validation error when less than two postings exist",
  },
  "journal.balance": {
    message: "Balance",
    description: "Balance entry type",
  },
  "journal.balanceHeader": {
    message: "Balance",
    description: "Table header for balance column",
  },
  "journal.balancesAfterEntry": {
    message: "Balances after entry",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Balances before entry",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "B",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Budget entries",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "Change",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "Cleared transactions",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "Close",
    description: "Close account entry type filter",
  },
  "journal.createNewJournalEntry": {
    message: "Create a new journal entry for this ledger",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "Create Account Entry",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "Create Balance Entry",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "Create Note Entry",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "Create Transaction Entry",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "Currency (e.g., USD)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "Currency is required",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "Custom",
    description: "Custom entry type filter",
  },
  "journal.commodity": {
    message: "Commodity",
    description: "Name of the Commodity directive type",
  },
  "journal.event": {
    message: "Event",
    description: "Name of the Event directive type",
  },
  "journal.query": {
    message: "Query",
    description: "Name of the Query directive type",
  },
  "journal.date": {
    message: "Date",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "D",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "Discovered documents",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Document",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message:
      "Downloads source transactions and balance assertions narrowed by the selected date, account, and search expression. Entry type and transaction status filters do not apply.",
    description: "Honest scope for the plaintext journal export dialog",
  },
  "journal.entryContext": {
    message: "Entry Context",
    description: "Dialog title for entry context",
  },
  "journal.entryContextDescription": {
    message: "Source and file location for {entry}.",
    description:
      "Screen-reader description of the entry context dialog; {entry} is the entry's date, payee and narration",
  },
  "journal.entryCreatedSuccess": {
    message: "Entry created successfully",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Location:",
    description: "Label for entry location in file",
  },
  "journal.entryLocationUnavailable": {
    message: "Source location unavailable",
    description: "Shown when entry context has no navigable filename/line",
  },
  "journal.openEntrySource": {
    message: "Open source at {location}",
    description: "Accessible name for the entry source location control",
  },
  "journal.errorLoadingJournalEntries": {
    message: "Error loading journal entries",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "Export",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "Export Journal",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Exporting...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "Failed to create balance entry",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "Failed to create note entry",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "Failed to create transaction",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "Failed to export journal",
    description: "Error message when journal export fails",
  },
  "journal.flag": {
    message: "Flag",
    description: "Accessible name for the journal flag column",
  },
  "journal.flagAbbrev": {
    message: "F",
    description: "Short label shown in the journal flag column header",
  },
  "journal.accountJournalTable": {
    message: "Account journal",
    description: "Accessible name for the account journal table",
  },
  "journal.journalTable": {
    message: "Journal",
    description: "Accessible name for the ledger journal table",
  },
  "journal.journal": {
    message: "Journal",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Journal exported successfully",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "L",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Linked documents",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Loading entry context...",
    description: "Loading message while fetching entry context",
  },
  "journal.metadata": {
    message: "Metadata",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "Narration",
    description: "Placeholder for narration field",
  },
  "journal.newEntry": {
    message: "New Entry",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "No currencies found",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "No journal entries found for the current filters.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noNarrationsFound": {
    message: "No narrations found",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "No payees found",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "Note",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "Note content",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Note content is required",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "Open",
    description: "Open account entry type filter",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "Other transactions",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Pad",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "Payee/Narration",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Payee",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Pending transactions",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "Postings",
    description: "Label for postings toggle filter",
  },
  "journal.postingCost": {
    message: "Cost",
    description:
      "Label for the unit lot cost in expanded journal posting details",
  },
  "journal.price": {
    message: "Price",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "Select account...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectCurrency": {
    message: "Select currency...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Select narration...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectPayee": {
    message: "Select payee...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "Toggle metadata",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "Toggle postings",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "Transaction",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "Transactions",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "Units",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "Unknown directive type",
    description: "Message shown for unrecognized beancount directive types",
  },
  "journal.sourceModified": {
    message: "Source has been modified",
    description: "Notice that entry source has unsaved changes",
  },
  "journal.entrySavedSuccess": {
    message: "Entry saved successfully",
    description: "Toast shown after saving an entry",
  },
  "journal.entryDeleteTitle": {
    message: "Delete entry",
    description: "Dialog title for the entry deletion confirmation",
  },
  "journal.entryDeleteDescription": {
    message:
      "Delete the entry at {location}? This removes it from the ledger and cannot be undone from the app.",
    description:
      "Confirmation message for deleting a journal entry. {location} is replaced with the entry's source location.",
  },
  "journal.entryDeleteConfirm": {
    message: "Delete entry",
    description: "Confirm button label in the entry deletion confirmation",
  },
  "journal.entryDeleteCancel": {
    message: "Cancel",
    description: "Cancel button label in the entry deletion confirmation",
  },
  "journal.entryDeletedSuccess": {
    message: "Entry deleted successfully",
    description: "Toast shown after deleting an entry",
  },
  "journal.noEntryContext": {
    message: "No entry context data available",
    description: "Empty state for entry context",
  },
  "journal.accumulated": {
    message: "accumulated",
    description: "Label before an accumulated balance difference",
  },
  "journal.fromAccount": {
    message: "from",
    description: "Label before a pad source account",
  },
  "journal.clearedStatus": {
    message: "Cleared",
    description: "Cleared transaction status",
  },
  "journal.pendingStatus": {
    message: "Pending",
    description: "Pending transaction status",
  },
  "journal.addPosting": {
    message: "Add posting",
    description: "Accessible name for adding a transaction posting row",
  },
  "journal.removePosting": {
    message: "Remove posting {number}",
    description:
      "Accessible name for removing a numbered transaction posting row",
  },
  "journal.payee": {
    message: "Payee",
    description: "Label for the payee field",
  },
  "journal.accountLabel": {
    message: "Account",
    description: "Label for the account field of a directive form",
  },
  "journal.amountLabel": {
    message: "Amount",
    description: "Label for the amount field of a directive form",
  },
  "journal.currencyLabel": {
    message: "Currency",
    description: "Label for the currency field of a directive form",
  },
  "journal.postingAccount": {
    message: "Posting {number} account",
    description:
      "Accessible label for a numbered transaction posting's account field",
  },
  "journal.postingAmount": {
    message: "Posting {number} amount",
    description:
      "Accessible label for a numbered transaction posting's amount field",
  },
  "journal.postingCurrency": {
    message: "Posting {number} currency",
    description:
      "Accessible label for a numbered transaction posting's currency field",
  },
  "journal.postingsUnbalanced": {
    message:
      "Postings don't balance: {residual} left over. Adjust an amount, or clear one to balance it automatically.",
    description:
      "Shown when a new transaction's postings leave a residual; {residual} is the amount and currency, e.g. 1 USD",
  },
  "journal.accountNotOpen": {
    message: "{account} isn't open in this ledger.",
    description:
      "Shown under a New Entry account field naming an account the ledger never opened; {account} is the name",
  },
  "journal.alsoOpenAccount": {
    message: "Also open {account} on {date}",
    description:
      "Checkbox label that adds an open directive for {account} dated {date} to the same New Entry write",
  },
  "journal.accountClosedBefore": {
    message: "{account} was closed on {date}, before this entry.",
    description:
      "Shown under a New Entry account field naming an account closed before the entry; {date} is its close date",
  },
  "journal.accountOpensAfter": {
    message: "{account} opens on {date}, after this entry.",
    description:
      "Shown under a New Entry account field naming an account opened after the entry; {date} is its open date",
  },
  "journal.discardEntryEditTitle": {
    message: "Discard your edit?",
    description:
      "Title of the confirmation shown when leaving Entry Context with unsaved source edits",
  },
  "journal.discardEntryEditDescription": {
    message: "Your changes to this entry's source haven't been saved.",
    description: "Body of the Entry Context discard confirmation",
  },
  "journal.keepEditing": {
    message: "Keep editing",
    description:
      "Button that returns to the Entry Context editor with the edit intact",
  },
  "journal.discardEntryEdit": {
    message: "Discard",
    description: "Button that discards the Entry Context edit and leaves",
  },
  "journal.entryChangedElsewhere": {
    message:
      "This entry was changed or removed since you opened it, so your edit wasn't saved. Copy your edit, then reload to see the latest version.",
    description:
      "Entry Context save refused because the entry changed elsewhere since it was opened",
  },
  "journal.copyMyEdit": {
    message: "Copy my edit",
    description: "Copies the unsaved Entry Context edit to the clipboard",
  },
  "journal.reloadEntries": {
    message: "Reload",
    description:
      "Closes Entry Context and refreshes the journal to show the latest entries",
  },
  "journal.autoAmount": {
    message: "auto",
    description: "Label for an automatically balanced amount",
  },
  "journal.generatedEntryTitle": {
    message: "Generated entry",
    description:
      "Heading for the read-only panel shown for a generated (padding) entry",
  },
  "journal.generatedConversionExplanation": {
    message:
      "This conversion was generated to clear the residual cost balance of a time-limited account journal, so it has no source line to view, edit, or delete.",
    description:
      "Explains that a generated conversion entry has no editable source directive",
  },
  "journal.generatedEntryExplanation": {
    message:
      "Beancount generated this entry from a pad directive, so it has no source line to view, edit, or delete.",
    description:
      "Explains that a generated padding entry has no editable source directive",
  },
  "journal.generatedOpeningExplanation": {
    message:
      "This opening balance was generated when the account journal was limited to a time range, so it has no source line to view, edit, or delete.",
    description:
      "Explains that a generated opening-balance entry has no editable source directive",
  },
  "journal.narration": {
    message: "Narration",
    description: "Label for narration field",
  },

  "journal.backToJournal": {
    message: "Back to journal",
    description: "Link from the entry page back to the ledger journal",
  },
  "journal.entryPageTitle": {
    message: "Entry",
    description: "Entry page heading for a shared ledger entry URL",
  },
  "journal.entryPageDescription": {
    message: "Source context for an entry in {ledgerName}.",
    description:
      "Entry page description; {ledgerName} is the ledger display name",
  },
  "journal.managedPriceEntryExplanation": {
    message:
      "This price comes from the managed feed {source}. It updates automatically and cannot be edited or deleted here; add your own price entry for this date to override it.",
    description:
      "Shown on a price entry that comes from a managed price include. {source} is the feed URL.",
  },
  "journal.pluginCopyExplanation": {
    message:
      "A plugin generated this entry from another one, so it can't be edited or deleted here. Change the source entry instead.",
    description:
      "Shown on an entry a plugin generated as a copy of another one.",
  },
  "journal.openSourceEntry": {
    message: "Open the source entry",
    description: "Link from a plugin copy to the entry it was made from.",
  },
};

export default enJournal;
