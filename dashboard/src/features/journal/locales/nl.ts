export interface TranslationEntry {
  message: string;
  description: string;
}

const nlJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Account",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "Rekening (e.g., Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Rekening is required",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "Accounts",
    description: "Plural form of account",
  },
  "journal.addNewJournalEntry": {
    message: "Nieuwe journaalpost toevoegen",
    description: "Aria label for add new journal entry button",
  },
  "journal.amountMustBeNumber": {
    message: "Bedrag moet een geldig getal zijn",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "Bedrag (bijv. 100,00)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "Bedrag is verplicht",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastTwoPostings": {
    message: "Er zijn minstens twee boekingen vereist",
    description: "Validation error when less than two postings exist",
  },
  "journal.balance": {
    message: "Saldo",
    description: "Balance entry type",
  },
  "journal.balanceHeader": {
    message: "Saldo",
    description: "Table header for balance column",
  },
  "journal.balancesAfterEntry": {
    message: "Saldi na boeking",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Saldi voor boeking",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "B",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Budgetposten",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "Wijziging",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "Wissened transactions",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "Sluiten",
    description: "Close account entry type filter",
  },
  "journal.createNewJournalEntry": {
    message: "Maak een nieuwe journaalpost voor dit grootboek",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "Accountvermelding aanmaken",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "Balansregel aanmaken",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "Notitievermelding aanmaken",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "Transactie aanmaken",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "Valuta (bijv. EUR)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "Valuta is verplicht",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "Aangepast",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "Datum",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "O",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "Ontdekte documenten",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Document",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message: "Download gefilterde posten als Beancount bestand",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "Context van boeking",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "Boeking succesvol aangemaakt",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Locatie:",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "Fout bij laden journaalposten",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "Exporteren",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "Journaal exporteren",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Exporteren...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "Saldo aanmaken mislukt",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "Notitie aanmaken mislukt",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "Transactie aanmaken mislukt",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "Journaal exporteren mislukt",
    description: "Error message when journal export fails",
  },
  "journal.journal": {
    message: "Journaal",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Journaal succesvol geëxporteerd",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "G",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Gekoppelde documenten",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Context laden...",
    description: "Loading message while fetching entry context",
  },
  "journal.metadata": {
    message: "Metadata",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "Omschrijving",
    description: "Placeholder for narration field",
  },
  "journal.newEntry": {
    message: "Nieuwe boeking",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "Geen valuta's gevonden",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "Geen journaalposten gevonden voor de huidige filters.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noNarrationsFound": {
    message: "Geen omschrijvingen gevonden",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "Geen begunstigden gevonden",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "Notitie",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "Notitie-inhoud",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Notitie-inhoud is verplicht",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "Openen",
    description: "Open account entry type filter",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "Overige transactions",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Pad",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "Begunstigde/Omschrijving",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Begunstigde",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "In behandeling transacties",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "Boekingen",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Prijs",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "Selecteer rekening...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "Selecteer saldodatum",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "Selecteer valuta...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Selecteer omschrijving...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "Selecteer notitiedatum",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "Selecteer begunstigde...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "Metadata aan/uit",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "Boekingen aan/uit",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "Transactie",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "Transacties",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "Eenheden",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "Onbekend directieftype",
    description: "Message shown for unrecognized beancount directive types",
  },
};

export default nlJournal;
