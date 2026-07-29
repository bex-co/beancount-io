export interface TranslationEntry {
  message: string;
  description: string;
}

const enJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Account",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPicker": {
    message: "Account Picker",
    description: "Dialog or dropdown title for selecting account",
  },
  "journal.accountPlaceholder": {
    message: "Account (e.g., Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Account is required",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "Accounts",
    description: "Plural form of account",
  },
  "journal.accountsPlural": {
    message: "accounts",
    description: "Lowercase plural form of accounts",
  },
  "journal.addNewJournalEntry": {
    message: "Add new journal entry",
    description: "Aria label for add new journal entry button",
  },
  "journal.addPosting": {
    message: "Add Posting",
    description: "Button text to add a new posting to transaction",
  },
  "journal.addTransaction": {
    message: "Add Transaction",
    description: "Button to add a new transaction",
  },
  "journal.amountEmptyError": {
    message: "Please input the amount",
    description: "Validation error when amount is not provided",
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
  "journal.atLeastOnePosting": {
    message: "At least one posting is required",
    description: "Validation error when no postings exist",
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
  "journal.closeAccount": {
    message: "Close Account",
    description: "Action to close an existing account",
  },
  "journal.cost": {
    message: "Cost",
    description: "Table header for cost column",
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
    message: "Download currently filtered entries as a Beancount file",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "Entry Context",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "Entry created successfully",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Location:",
    description: "Label for entry location in file",
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
  "journal.flagPlaceholder": {
    message: "Flag (e.g., *)",
    description: "Placeholder for transaction flag",
  },
  "journal.from": {
    message: "From",
    description: "Label for source account in transaction",
  },
  "journal.journal": {
    message: "Journal",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Journal exported successfully",
    description: "Success message after exporting journal",
  },
  "journal.journalLoadError": {
    message: "Failed to load journal: ",
    description: "Error message prefix when journal fails to load",
  },
  "journal.journalWelcomeInstruction1": {
    message: 'Use the "Add Transaction" button to create entries',
    description: "First instruction for getting started",
  },
  "journal.journalWelcomeInstruction2": {
    message: "Upload beancount files through the web interface",
    description: "Second instruction for getting started",
  },
  "journal.journalWelcomeInstruction3": {
    message: "Import existing accounting data",
    description: "Third instruction for getting started",
  },
  "journal.journalWelcomeInstructionFinal": {
    message: "Once you add some transactions, they'll appear here.",
    description: "Final instruction message",
  },
  "journal.journalWelcomeInstructions": {
    message: "To get started:",
    description: "Header for getting started instructions",
  },
  "journal.journalWelcomeMessage": {
    message: "You don't have any journal entries yet.",
    description: "Welcome message for empty journal",
  },
  "journal.journalWelcomeTitle": {
    message: "Welcome to your Journal! 📔",
    description: "Welcome title for empty journal page",
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
  "journal.loadingMore": {
    message: "Loading more...",
    description: "Loading message when fetching more entries",
  },
  "journal.metadata": {
    message: "Metadata",
    description: "Label for metadata toggle filter",
  },
  "journal.narration": {
    message: "Narration",
    description: "Label for transaction description/notes field",
  },
  "journal.narrationPlaceholder": {
    message: "Narration",
    description: "Placeholder for narration field",
  },
  "journal.narrationRequired": {
    message: "Narration is required",
    description: "Validation error when narration is missing",
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
  "journal.noMoreEntries": {
    message: "No more entries",
    description: "Message when no more entries to load",
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
  "journal.openAccount": {
    message: "Open Account",
    description: "Action to open a new account",
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
  "journal.payee": {
    message: "Payee",
    description: "Label for payee field in transaction",
  },
  "journal.payeeNarration": {
    message: "Payee/Narration",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Payee",
    description: "Placeholder for payee field",
  },
  "journal.payeeRequired": {
    message: "Payee is required",
    description: "Validation error when payee is missing",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Pending transactions",
    description: "Filter tooltip for pending transactions",
  },
  "journal.pleaseInput": {
    message: "Please input...",
    description: "Placeholder text prompting user to input",
  },
  "journal.posting": {
    message: "Posting",
    description: "Label for posting section in transaction form",
  },
  "journal.postings": {
    message: "Postings",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Price",
    description: "Price entry type filter",
  },
  "journal.priceHeader": {
    message: "Price",
    description: "Table header for price column",
  },
  "journal.quickAdd": {
    message: "Quick Add",
    description: "Button for quick transaction entry",
  },
  "journal.saveFailed": {
    message: "Failed to save",
    description: "Error message when save fails",
  },
  "journal.saveSuccess": {
    message: "Transaction saved!",
    description: "Success message after saving transaction",
  },
  "journal.selectAccount": {
    message: "Select account...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "Select balance date",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "Select currency...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Select narration...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "Select note date",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "Select payee...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.selectTransactionDate": {
    message: "Select transaction date",
    description: "Placeholder for date picker",
  },
  "journal.to": {
    message: "To",
    description: "Label for destination account in transaction",
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
};

export default enJournal;
