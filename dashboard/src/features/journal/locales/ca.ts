export interface TranslationEntry {
  message: string;
  description: string;
}

const caJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Compte",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPicker": {
    message: "Selector de compte",
    description: "Dialog or dropdown title for selecting account",
  },
  "journal.accountPlaceholder": {
    message: "Compte (p. ex., Actius:Banc:Corrent)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "El compte és obligatori",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "Comptes",
    description: "Plural form of account",
  },
  "journal.accountsPlural": {
    message: "comptes",
    description: "Lowercase plural form of accounts",
  },
  "journal.addNewJournalEntry": {
    message: "Afegir una entrada de diari nova",
    description: "Aria label for add new journal entry button",
  },
  "journal.addPosting": {
    message: "Afegir apunt",
    description: "Button text to add a new posting to transaction",
  },
  "journal.addTransaction": {
    message: "Afegir transacció",
    description: "Button to add a new transaction",
  },
  "journal.amountEmptyError": {
    message: "Si us plau, introdueix l'import",
    description: "Validation error when amount is not provided",
  },
  "journal.amountMustBeNumber": {
    message: "L'import ha de ser un número vàlid",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "Import (p. ex., 100.00)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "L'import és obligatori",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastOnePosting": {
    message: "Es requereix almenys un apunt",
    description: "Validation error when no postings exist",
  },
  "journal.atLeastTwoPostings": {
    message: "Es requereixen com a mínim dues anotacions",
    description: "Validation error when less than two postings exist",
  },
  "journal.balance": {
    message: "Balanç",
    description: "Balance entry type",
  },
  "journal.balanceHeader": {
    message: "Balanç",
    description: "Table header for balance column",
  },
  "journal.balancesAfterEntry": {
    message: "Balanços després de l'entrada",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Balanços abans de l'entrada",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "P",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Entrades de pressupost",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "Canvi",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "Transaccions compensades",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "Tancar",
    description: "Close account entry type filter",
  },
  "journal.closeAccount": {
    message: "Tancar compte",
    description: "Action to close an existing account",
  },
  "journal.cost": {
    message: "Cost",
    description: "Table header for cost column",
  },
  "journal.createNewJournalEntry": {
    message: "Crea una entrada de diari nova per a aquest llibre",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "Crear entrada de compte",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "Crear entrada de saldo",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "Crear entrada de nota",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "Crear entrada de transacció",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "Moneda (p. ex., USD)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "La moneda és obligatòria",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "Personalitzat",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "Data",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "D",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "Documents descoberts",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Document",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message:
      "Descarregar les entrades filtrades actualment com a fitxer de Beancount",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "Context de l'entrada",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "Entrada creada correctament",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Ubicació:",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "Error en carregar les entrades del diari",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "Exportar",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "Exportar diari",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Exportant...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "Error en crear l'entrada de balanç",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "Error en crear l'entrada de nota",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "Error en crear la transacció",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "Error en exportar el diari",
    description: "Error message when journal export fails",
  },
  "journal.flagPlaceholder": {
    message: "Indicador (p. ex., *)",
    description: "Placeholder for transaction flag",
  },
  "journal.from": {
    message: "De",
    description: "Label for source account in transaction",
  },
  "journal.journal": {
    message: "Diari",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Diari exportat correctament",
    description: "Success message after exporting journal",
  },
  "journal.journalLoadError": {
    message: "Error en carregar el diari: ",
    description: "Error message prefix when journal fails to load",
  },
  "journal.journalWelcomeInstruction1": {
    message: 'Utilitzeu el botó "Afegir transacció" per crear entrades',
    description: "First instruction for getting started",
  },
  "journal.journalWelcomeInstruction2": {
    message: "Pugeu fitxers de beancount a través de la interfície web",
    description: "Second instruction for getting started",
  },
  "journal.journalWelcomeInstruction3": {
    message: "Importa dades comptables existents",
    description: "Third instruction for getting started",
  },
  "journal.journalWelcomeInstructionFinal": {
    message: "Pugeu fitxers de beancount a través de la interfície web",
    description: "Final instruction message",
  },
  "journal.journalWelcomeInstructions": {
    message: "Per començar:",
    description: "Header for getting started instructions",
  },
  "journal.journalWelcomeMessage": {
    message: "Encara no tens entrades al diari.",
    description: "Welcome message for empty journal",
  },
  "journal.journalWelcomeTitle": {
    message: "Benvingut al teu Diari! 📔",
    description: "Welcome title for empty journal page",
  },
  "journal.linked": {
    message: "Quan afegiu algunes transaccions, apareixeran aquí.",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "V",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Documents vinculats",
    description: "Loading message while fetching entry context",
  },
  "journal.loadingMore": {
    message: "Carregant més...",
    description: "Loading message when fetching more entries",
  },
  "journal.metadata": {
    message: "Carregant el context de l'entrada...",
    description: "Label for metadata toggle filter",
  },
  "journal.narration": {
    message: "Descripció",
    description: "Label for transaction description/notes field",
  },
  "journal.narrationPlaceholder": {
    message: "Metadades",
    description: "Placeholder for narration field",
  },
  "journal.narrationRequired": {
    message: "Descripció",
    description: "Validation error when narration is missing",
  },
  "journal.newEntry": {
    message: "La descripció és obligatòria",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "Entrada nova",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "No s'han trobat monedes",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noMoreEntries": {
    message: "No hi ha més entrades",
    description: "Message when no more entries to load",
  },
  "journal.noNarrationsFound": {
    message: "No s'han trobat entrades de diari per als filtres actuals.",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "No s'han trobat descripcions",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "No s'han trobat beneficiaris",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "Nota",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Contingut de la nota",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "El contingut de la nota és obligatori",
    description: "Open account entry type filter",
  },
  "journal.openAccount": {
    message: "Obrir compte",
    description: "Action to open a new account",
  },
  "journal.other": {
    message: "Obrir",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "x",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Altres transaccions",
    description: "Pad entry type filter",
  },
  "journal.payee": {
    message: "Beneficiari",
    description: "Label for payee field in transaction",
  },
  "journal.payeeNarration": {
    message: "Emplenar",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Beneficiari/Descripció",
    description: "Placeholder for payee field",
  },
  "journal.payeeRequired": {
    message: "Beneficiari",
    description: "Validation error when payee is missing",
  },
  "journal.pending": {
    message: "El beneficiari és obligatori",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "!",
    description: "Filter tooltip for pending transactions",
  },
  "journal.pleaseInput": {
    message: "Si us plau, introdueix...",
    description: "Placeholder text prompting user to input",
  },
  "journal.posting": {
    message: "Transaccions pendents",
    description: "Label for posting section in transaction form",
  },
  "journal.postings": {
    message: "Entrades",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Apunt",
    description: "Price entry type filter",
  },
  "journal.priceHeader": {
    message: "Preu",
    description: "Table header for price column",
  },
  "journal.quickAdd": {
    message: "Afegir ràpid",
    description: "Button for quick transaction entry",
  },
  "journal.saveFailed": {
    message: "Error al guardar",
    description: "Error message when save fails",
  },
  "journal.saveSuccess": {
    message: "Transacció guardada!",
    description: "Success message after saving transaction",
  },
  "journal.selectAccount": {
    message: "Preu",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "Seleccionar compte...",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "Seleccionar data de balanç",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Seleccionar moneda...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "Seleccionar descripció...",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "Seleccionar data de la nota",
    description: "Placeholder for payee selection combobox",
  },
  "journal.selectTransactionDate": {
    message: "Seleccionar beneficiari...",
    description: "Placeholder for date picker",
  },
  "journal.to": {
    message: "A",
    description: "Label for destination account in transaction",
  },
  "journal.toggleMetadata": {
    message: "Seleccionar data de transacció",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "Alternar metadades",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "Transacció",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "Transaccions",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "Alternar apunts",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "Unitats",
    description: "Message shown for unrecognized beancount directive types",
  },
};

export default caJournal;
