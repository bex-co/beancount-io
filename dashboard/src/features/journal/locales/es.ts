export interface TranslationEntry {
  message: string;
  description: string;
}

const esJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Cuenta",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "Cuenta (e.g., Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Cuenta is required",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "Cuentas",
    description: "Plural form of account",
  },
  "journal.addNewJournalEntry": {
    message: "Agregar nueva entrada al diario",
    description: "Aria label for add new journal entry button",
  },
  "journal.amountMustBeNumber": {
    message: "El monto debe ser un número válido",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "Monto (ej., 100.00)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "Se requiere el monto",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastTwoPostings": {
    message: "Se requieren al menos dos asientos",
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
    message: "Saldos después de la entrada",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Saldos antes de la entrada",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "P",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Entradas de presupuesto",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "Cambio",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "Limpiared transactions",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "Cerrar",
    description: "Close account entry type filter",
  },
  "journal.createNewJournalEntry": {
    message: "Crear una nueva entrada de diario para este libro mayor",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "Crear Entrada de Cuenta",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "Crear Entrada de Balance",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "Crear Entrada de Nota",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "Crear Entrada de Transacción",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "Moneda (ej., USD)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "Se requiere la moneda",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "Personalizado",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "Fecha",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "D",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "Documentos descubiertos",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Documento",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message:
      "Descargar las entradas filtradas actualmente como un archivo Beancount",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "Contexto de Entrada",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "Entrada creada exitosamente",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Ubicación:",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "Error al cargar las entradas del diario",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "Exportar",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "Exportar Diario",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Exportando...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "Error al crear la entrada de saldo",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "Error al crear la entrada de nota",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "Error al crear la transacción",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "Error al exportar el diario",
    description: "Error message when journal export fails",
  },
  "journal.journal": {
    message: "Diario",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Diario exportado exitosamente",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "L",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Documentos vinculados",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Cargando contexto de entrada...",
    description: "Loading message while fetching entry context",
  },
  "journal.metadata": {
    message: "Metadatos",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "Narración",
    description: "Placeholder for narration field",
  },
  "journal.newEntry": {
    message: "Nueva Entrada",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "No se encontraron monedas",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "No se encontraron entradas de diario para los filtros actuales.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noNarrationsFound": {
    message: "No se encontraron narraciones",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "No se encontraron beneficiarios",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "Nota",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "Contenido de la nota",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Se requiere el contenido de la nota",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "Abrir",
    description: "Open account entry type filter",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "Otro transactions",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Rellenar",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "Beneficiario/Narración",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Beneficiario",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Transacciones pendientes",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "Asientos",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Precio",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "Seleccionar cuenta...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "Seleccionar fecha de saldo",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "Seleccionar moneda...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Seleccionar narración...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "Seleccionar fecha de nota",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "Seleccionar beneficiario...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "Alternar metadatos",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "Alternar asientos",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "Transacción",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "Transacciones",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "Unidades",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "Tipo de directiva desconocido",
    description: "Message shown for unrecognized beancount directive types",
  },
};

export default esJournal;
