export interface TranslationEntry {
  message: string;
  description: string;
}

const skJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Účet",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "Účet (napr. Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Účet je povinný",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "Účty",
    description: "Plural form of account",
  },
  "journal.addNewJournalEntry": {
    message: "Pridať nový záznam do denníka",
    description: "Aria label for add new journal entry button",
  },
  "journal.amountMustBeNumber": {
    message: "Suma musí byť platné číslo",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "Suma (napr. 100.00)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "Suma je povinná",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastTwoPostings": {
    message: "Vyžadujú sa aspoň dva záznamy",
    description: "Validation error when less than two postings exist",
  },
  "journal.balance": {
    message: "Zostatok",
    description: "Table column header for balance",
  },
  "journal.balanceHeader": {
    message: "Zostatok",
    description: "Table header for balance column",
  },
  "journal.balancesAfterEntry": {
    message: "Zostatky po zápise",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Zostatky pred zápisom",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "B",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Rozpočtové záznamy",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "Zmena",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "Vyrovnané transakcie",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "Zatvoriť",
    description: "Close account entry type filter",
  },
  "journal.createNewJournalEntry": {
    message: "Vytvorte nový záznam v denníku pre túto knihu",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "Vytvoriť záznam účtu",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "Vytvoriť záznam zostatku",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "Vytvoriť záznam poznámky",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "Vytvoriť záznam transakcie",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "Mena (napr. USD)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "Mena je povinná",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "Vlastné",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "Dátum",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "D",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "Objavené dokumenty",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Dokument",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message: "Stiahnuť aktuálne filtrované záznamy ako Beancount súbor",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "Kontext záznamu",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "Záznam bol úspešne vytvorený",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Umiestnenie:",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "Chyba pri načítaní záznamov denníka",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "Exportovať",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "Exportovať denník",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Exportujem...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "Vytvorenie záznamu zostatku zlyhalo",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "Vytvorenie poznámky zlyhalo",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "Vytvorenie transakcie zlyhalo",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "Export denníka zlyhal",
    description: "Error message when journal export fails",
  },
  "journal.journal": {
    message: "Denník",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Denník bol úspešne exportovaný",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "L",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Prepojené dokumenty",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Načítavam kontext záznamu...",
    description: "Loading message while fetching entry context",
  },
  "journal.metadata": {
    message: "Metadáta",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "Popis",
    description: "Placeholder for narration field",
  },
  "journal.newEntry": {
    message: "Nový záznam",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "Nenašli sa žiadne meny",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "Pre aktuálne filtre neboli nájdené žiadne záznamy v denníku.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noNarrationsFound": {
    message: "Nenašli sa žiadne popisy",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "Nenašli sa žiadni príjemcovia",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "Poznámka",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "Obsah poznámky",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Obsah poznámky je povinný",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "Otvoriť",
    description: "Open account entry type filter",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "Ostatné transakcie",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Vyrovnanie",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "Príjemca/Popis",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Príjemca",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Čakajúce transakcie",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "Zápisy",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Cena",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "Vyberte účet...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "Vyberte dátum zostatku",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "Vyberte menu...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Vyberte popis...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "Vyberte dátum poznámky",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "Vyberte príjemcu...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "Prepnúť metadáta",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "Prepnúť zápisy",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "Transakcia",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "Transakcie",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "Jednotky",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "Neznámy typ direktívy",
    description: "Message shown for unrecognized beancount directive types",
  },
  "journal.sourceModified": {
    message: "Zdroj bol upravený",
    description: "Notice that entry source has unsaved changes",
  },
  "journal.entrySavedSuccess": {
    message: "Záznam bol úspešne uložený",
    description: "Toast shown after saving an entry",
  },
  "journal.entryDeletedSuccess": {
    message: "Záznam bol úspešne odstránený",
    description: "Toast shown after deleting an entry",
  },
  "journal.noEntryContext": {
    message: "Nie sú k dispozícii žiadne kontextové údaje",
    description: "Empty state for entry context",
  },
  "journal.accumulated": {
    message: "nahromadených",
    description: "Label before an accumulated balance difference",
  },
  "journal.fromAccount": {
    message: "od",
    description: "Label before a pad source account",
  },
  "journal.clearedStatus": {
    message: "Vymazané",
    description: "Cleared transaction status",
  },
  "journal.pendingStatus": {
    message: "Čaká sa",
    description: "Pending transaction status",
  },
  "journal.blankStatus": {
    message: "(prázdne)",
    description: "Blank transaction status option",
  },
  "journal.autoAmount": {
    message: "auto",
    description: "Label for an automatically balanced amount",
  },
};

export default skJournal;
