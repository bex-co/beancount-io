export interface TranslationEntry {
  message: string;
  description: string;
}

const skJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Účet",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPicker": {
    message: "Výber účtu",
    description: "Dialog or dropdown title for selecting account",
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
  "journal.accountsPlural": {
    message: "účty",
    description: "Lowercase plural form of accounts",
  },
  "journal.addNewJournalEntry": {
    message: "Pridať nový záznam do denníka",
    description: "Aria label for add new journal entry button",
  },
  "journal.addPosting": {
    message: "Pridať zápis",
    description: "Button text to add a new posting to transaction",
  },
  "journal.addTransaction": {
    message: "Pridať transakciu",
    description: "Button to add a new transaction",
  },
  "journal.amountEmptyError": {
    message: "Prosím zadajte sumu",
    description: "Validation error when amount is not provided",
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
  "journal.atLeastOnePosting": {
    message: "Je potrebný aspoň jeden zápis",
    description: "Validation error when no postings exist",
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
  "journal.closeAccount": {
    message: "Zatvoriť účet",
    description: "Action to close an existing account",
  },
  "journal.cost": {
    message: "Obstarávacia cena",
    description: "Table header for cost column",
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
  "journal.flagPlaceholder": {
    message: "Príznak (napr. *)",
    description: "Placeholder for transaction flag",
  },
  "journal.from": {
    message: "Od",
    description: "Label for source account in transaction",
  },
  "journal.journal": {
    message: "Denník",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Denník bol úspešne exportovaný",
    description: "Success message after exporting journal",
  },
  "journal.journalLoadError": {
    message: "Načítanie denníka zlyhalo: ",
    description: "Error message prefix when journal fails to load",
  },
  "journal.journalWelcomeInstruction1": {
    message: 'Použite tlačidlo "Pridať transakciu" na vytvorenie záznamov',
    description: "First instruction for getting started",
  },
  "journal.journalWelcomeInstruction2": {
    message: "Nahrajte beancount súbory cez webové rozhranie",
    description: "Second instruction for getting started",
  },
  "journal.journalWelcomeInstruction3": {
    message: "Importujte existujúce účtovné údaje",
    description: "Third instruction for getting started",
  },
  "journal.journalWelcomeInstructionFinal": {
    message: "Akonáhle pridáte transakcie, objavia sa tu.",
    description: "Final instruction message",
  },
  "journal.journalWelcomeInstructions": {
    message: "Pre začiatok:",
    description: "Header for getting started instructions",
  },
  "journal.journalWelcomeMessage": {
    message: "Zatiaľ nemáte žiadne záznamy v denníku.",
    description: "Welcome message for empty journal",
  },
  "journal.journalWelcomeTitle": {
    message: "Vitajte vo vašom Denníku! 📔",
    description: "Welcome title for empty journal page",
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
  "journal.loadingMore": {
    message: "Načítava sa viac...",
    description: "Loading message when fetching more entries",
  },
  "journal.metadata": {
    message: "Metadáta",
    description: "Label for metadata toggle filter",
  },
  "journal.narration": {
    message: "Popis",
    description: "Label for transaction description/notes field",
  },
  "journal.narrationPlaceholder": {
    message: "Popis",
    description: "Placeholder for narration field",
  },
  "journal.narrationRequired": {
    message: "Popis je povinný",
    description: "Validation error when narration is missing",
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
  "journal.noMoreEntries": {
    message: "Žiadne ďalšie záznamy",
    description: "Message when no more entries to load",
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
  "journal.openAccount": {
    message: "Otvoriť účet",
    description: "Action to open a new account",
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
  "journal.payee": {
    message: "Príjemca",
    description: "Label for payee field in transaction",
  },
  "journal.payeeNarration": {
    message: "Príjemca/Popis",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Príjemca",
    description: "Placeholder for payee field",
  },
  "journal.payeeRequired": {
    message: "Príjemca je povinný",
    description: "Validation error when payee is missing",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Čakajúce transakcie",
    description: "Filter tooltip for pending transactions",
  },
  "journal.pleaseInput": {
    message: "Prosím zadajte...",
    description: "Placeholder text prompting user to input",
  },
  "journal.posting": {
    message: "Zápis",
    description: "Label for posting section in transaction form",
  },
  "journal.postings": {
    message: "Zápisy",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Cena",
    description: "Price entry type filter",
  },
  "journal.priceHeader": {
    message: "Cena",
    description: "Table header for price column",
  },
  "journal.quickAdd": {
    message: "Rýchle pridanie",
    description: "Button for quick transaction entry",
  },
  "journal.saveFailed": {
    message: "Ukladanie zlyhalo",
    description: "Error message when save fails",
  },
  "journal.saveSuccess": {
    message: "Transakcia uložená!",
    description: "Success message after saving transaction",
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
  "journal.selectTransactionDate": {
    message: "Vyberte dátum transakcie",
    description: "Placeholder for date picker",
  },
  "journal.to": {
    message: "Pre",
    description: "Label for destination account in transaction",
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
};

export default skJournal;
