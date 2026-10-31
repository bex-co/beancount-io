export interface TranslationEntry {
  message: string;
  description: string;
}

const caJournal: Record<string, TranslationEntry> = {
  "journal.openEntryWithContext": {
    message: "Obre l’entrada {entry} (fila {position})",
    description:
      "Accessible name for opening Entry Context, including the entry identity and row position",
  },
  "journal.showEntryPostings_one": {
    message: "Mostra {count} apunt de {entry} (fila {position})",
    description:
      "Accessible name for revealing this row's postings, including their count and entry identity",
  },
  "journal.showEntryPostings_many": {
    message: "Mostra {count} apunts de {entry} (fila {position})",
    description:
      "Accessible name for revealing this row's postings, including their count and entry identity",
  },
  "journal.showEntryPostings_other": {
    message: "Mostra {count} apunts de {entry} (fila {position})",
    description:
      "Accessible name for revealing this row's postings, including their count and entry identity",
  },
  "journal.hideEntryPostings_one": {
    message: "Amaga {count} apunt de {entry} (fila {position})",
    description:
      "Accessible name for hiding this row's postings, including their count and entry identity",
  },
  "journal.hideEntryPostings_many": {
    message: "Amaga {count} apunts de {entry} (fila {position})",
    description:
      "Accessible name for hiding this row's postings, including their count and entry identity",
  },
  "journal.hideEntryPostings_other": {
    message: "Amaga {count} apunts de {entry} (fila {position})",
    description:
      "Accessible name for hiding this row's postings, including their count and entry identity",
  },
  "journal.visibleEntryPostings_one": {
    message: "Es mostra {count} apunt de {entry} (fila {position})",
    description:
      "Accessible name for the static posting count when all rows are forced open",
  },
  "journal.visibleEntryPostings_many": {
    message: "Es mostren {count} apunts de {entry} (fila {position})",
    description:
      "Accessible name for the static posting count when all rows are forced open",
  },
  "journal.visibleEntryPostings_other": {
    message: "Es mostren {count} apunts de {entry} (fila {position})",
    description:
      "Accessible name for the static posting count when all rows are forced open",
  },
  "journal.account": {
    message: "Compte",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "Compte (p. ex., Actius:Banc:Corrent)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "El compte és obligatori",
    description: "Validation error when account is missing",
  },
  "journal.addNewJournalEntry": {
    message: "Afegir una entrada de diari nova",
    description: "Aria label for add new journal entry button",
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
  "journal.commodity": {
    message: "Mercaderia",
    description: "Name of the Commodity directive type",
  },
  "journal.event": {
    message: "Esdeveniment",
    description: "Name of the Event directive type",
  },
  "journal.query": {
    message: "Consulta",
    description: "Name of the Query directive type",
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
      "Descarrega transaccions d'origen i assercions de saldo acotades per la data, el compte i l'expressió de cerca seleccionades. Els filtres de tipus d'assentament i estat de transacció no s'apliquen.",
    description: "Honest scope for the plaintext journal export dialog",
  },
  "journal.entryContext": {
    message: "Context de l'entrada",
    description: "Dialog title for entry context",
  },
  "journal.entryContextDescription": {
    message: "Font i ubicació al fitxer de {entry}.",
    description:
      "Screen-reader description of the entry context dialog; {entry} is the entry's date, payee and narration",
  },
  "journal.entryCreatedSuccess": {
    message: "Entrada creada correctament",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Ubicació:",
    description: "Label for entry location in file",
  },
  "journal.entryLocationUnavailable": {
    message: "Ubicació de l'origen no disponible",
    description:
      "Es mostra quan el context de l'entrada no té fitxer/línia navegables",
  },
  "journal.openEntrySource": {
    message: "Obre l'origen a {location}",
    description: "Accessible name for the entry source location control",
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
  "journal.flag": {
    message: "Indicador",
    description: "Accessible name for the journal flag column",
  },
  "journal.flagAbbrev": {
    message: "F",
    description: "Short label shown in the journal flag column header",
  },
  "journal.notBooked": {
    message: "No comptabilitzada, no es compta",
    description:
      "Badge on a journal transaction the ledger could not book (for example a sale with no matching lot): it is listed so it can be fixed, but no balance counts it",
  },
  "journal.accountJournalTable": {
    message: "Diari del compte",
    description: "Accessible name for the account journal table",
  },
  "journal.journalTable": {
    message: "Diari",
    description: "Accessible name for the ledger journal table",
  },
  "journal.journal": {
    message: "Diari",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Diari exportat correctament",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "V",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Documents vinculats",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Carregant el context de l'entrada...",
    description: "Loading message while fetching entry context",
  },
  "journal.metadata": {
    message: "Metadades",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "Descripció",
    description: "Placeholder for narration field",
  },
  "journal.newEntry": {
    message: "Entrada nova",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "No s'han trobat monedes",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "No s'han trobat entrades de diari per als filtres actuals.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noNarrationsFound": {
    message: "No s'han trobat descripcions",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "No s'han trobat beneficiaris",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "Nota",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "Contingut de la nota",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "El contingut de la nota és obligatori",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "Obrir",
    description: "Open account entry type filter",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "Altres transaccions",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Emplenar",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "Beneficiari/Descripció",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Beneficiari",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Transaccions pendents",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "Apunts",
    description: "Label for postings toggle filter",
  },
  "journal.postingCost": {
    message: "Cost",
    description:
      "Label for the unit lot cost in expanded journal posting details",
  },
  "journal.price": {
    message: "Preu",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "Seleccionar compte...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectCurrency": {
    message: "Seleccionar moneda...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Seleccionar descripció...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectPayee": {
    message: "Seleccionar beneficiari...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "Alternar metadades",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "Alternar apunts",
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
    message: "Unitats",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "Tipus de directiva desconegut",
    description: "Message shown for unrecognized beancount directive types",
  },
  "journal.sourceModified": {
    message: "La font s'ha modificat",
    description: "Notice that entry source has unsaved changes",
  },
  "journal.entrySavedSuccess": {
    message: "L'entrada s'ha desat correctament",
    description: "Toast shown after saving an entry",
  },
  "journal.entryDeleteTitle": {
    message: "Suprimeix l'assentament",
    description: "Dialog title for the entry deletion confirmation",
  },
  "journal.entryDeleteDescription": {
    message:
      "Vols suprimir l'assentament de {location}? S'eliminarà del llibre i no es pot desfer des de l'aplicació.",
    description:
      "Confirmation message for deleting a journal entry. {location} is replaced with the entry's source location.",
  },
  "journal.entryDeleteConfirm": {
    message: "Suprimeix l'assentament",
    description: "Confirm button label in the entry deletion confirmation",
  },
  "journal.entryDeleteCancel": {
    message: "Cancel·la",
    description: "Cancel button label in the entry deletion confirmation",
  },
  "journal.entryDeletedSuccess": {
    message: "L'entrada s'ha suprimit correctament",
    description: "Toast shown after deleting an entry",
  },
  "journal.noEntryContext": {
    message: "No hi ha dades de context d'entrada disponibles",
    description: "Empty state for entry context",
  },
  "journal.accumulated": {
    message: "acumulat",
    description: "Label before an accumulated balance difference",
  },
  "journal.fromAccount": {
    message: "de",
    description: "Label before a pad source account",
  },
  "journal.clearedStatus": {
    message: "Esborrat",
    description: "Cleared transaction status",
  },
  "journal.pendingStatus": {
    message: "Pendent",
    description: "Pending transaction status",
  },
  "journal.addPosting": {
    message: "Afegeix apunt",
    description: "Accessible name for adding a transaction posting row",
  },
  "journal.removePosting": {
    message: "Elimina l'apunt {number}",
    description:
      "Accessible name for removing a numbered transaction posting row",
  },
  "journal.payee": {
    message: "Beneficiari",
    description: "Label for the payee field",
  },
  "journal.accountLabel": {
    message: "Compte",
    description: "Label for the account field of a directive form",
  },
  "journal.amountLabel": {
    message: "Import",
    description: "Label for the amount field of a directive form",
  },
  "journal.currencyLabel": {
    message: "Moneda",
    description: "Label for the currency field of a directive form",
  },
  "journal.postingAccount": {
    message: "Compte de l'apunt {number}",
    description:
      "Accessible label for a numbered transaction posting's account field",
  },
  "journal.postingAmount": {
    message: "Import de l'apunt {number}",
    description:
      "Accessible label for a numbered transaction posting's amount field",
  },
  "journal.postingCurrency": {
    message: "Moneda de l'apunt {number}",
    description:
      "Accessible label for a numbered transaction posting's currency field",
  },
  "journal.postingsUnbalanced": {
    message:
      "Els apunts no quadren: en sobren {residual}. Ajusteu un import o buideu-ne un perquè es quadri automàticament.",
    description:
      "Shown when a new transaction's postings leave a residual; {residual} is the amount and currency, e.g. 1 USD",
  },
  "journal.accountNotOpen": {
    message: "{account} no està obert en aquest llibre.",
    description:
      "Shown under a New Entry account field naming an account the ledger never opened; {account} is the name",
  },
  "journal.alsoOpenAccount": {
    message: "Obre també {account} el {date}",
    description:
      "Checkbox label that adds an open directive for {account} dated {date} to the same New Entry write",
  },
  "journal.accountClosedBefore": {
    message: "{account} es va tancar el {date}, abans d'aquest apunt.",
    description:
      "Shown under a New Entry account field naming an account closed before the entry; {date} is its close date",
  },
  "journal.accountOpensAfter": {
    message: "{account} s'obre el {date}, després d'aquest apunt.",
    description:
      "Shown under a New Entry account field naming an account opened after the entry; {date} is its open date",
  },
  "journal.discardEntryEditTitle": {
    message: "Voleu descartar l'edició?",
    description:
      "Title of the confirmation shown when leaving Entry Context with unsaved source edits",
  },
  "journal.discardEntryEditDescription": {
    message: "Els canvis al codi font d'aquest apunt no s'han desat.",
    description: "Body of the Entry Context discard confirmation",
  },
  "journal.keepEditing": {
    message: "Continua editant",
    description:
      "Button that returns to the Entry Context editor with the edit intact",
  },
  "journal.discardEntryEdit": {
    message: "Descarta",
    description: "Button that discards the Entry Context edit and leaves",
  },
  "journal.entryChangedElsewhere": {
    message:
      "Aquest apunt s'ha canviat o eliminat des que el vau obrir, així que la vostra edició no s'ha desat. Copieu l'edició i torneu a carregar per veure'n la versió més recent.",
    description:
      "Entry Context save refused because the entry changed elsewhere since it was opened",
  },
  "journal.copyMyEdit": {
    message: "Copia la meva edició",
    description: "Copies the unsaved Entry Context edit to the clipboard",
  },
  "journal.reloadEntries": {
    message: "Torna a carregar",
    description:
      "Closes Entry Context and refreshes the journal to show the latest entries",
  },
  "journal.autoAmount": {
    message: "automàtic",
    description: "Label for an automatically balanced amount",
  },
  "journal.generatedEntryTitle": {
    message: "Entrada generada",
    description:
      "Heading for the read-only panel shown for a generated (padding) entry",
  },
  "journal.generatedConversionExplanation": {
    message:
      "Aquesta conversió s'ha generat per liquidar el saldo de cost residual d'un llibre diari limitat en el temps, de manera que no té cap línia d'origen per veure, editar ni eliminar.",
    description:
      "Explains that a generated conversion entry has no editable source directive",
  },
  "journal.generatedEntryExplanation": {
    message:
      "Beancount ha generat aquesta entrada a partir d'una directiva pad, de manera que no té cap línia d'origen per veure, editar o eliminar.",
    description:
      "Explains that a generated padding entry has no editable source directive",
  },
  "journal.generatedOpeningExplanation": {
    message:
      "Aquest saldo inicial s'ha generat en limitar el llibre diari a un interval de temps, de manera que no té cap línia d'origen per veure, editar ni eliminar.",
    description:
      "Explains that a generated opening-balance entry has no editable source directive",
  },
  "journal.narration": {
    message: "Descripció",
    description: "Label for narration field",
  },

  "journal.backToJournal": {
    message: "Torna al diari",
    description: "Link from the entry page back to the ledger journal",
  },
  "journal.entryPageTitle": {
    message: "Assentament",
    description: "Entry page heading for a shared ledger entry URL",
  },
  "journal.entryPageDescription": {
    message: "Context de font d'un assentament a {ledgerName}.",
    description:
      "Entry page description; {ledgerName} is the ledger display name",
  },
  "journal.managedPriceEntryExplanation": {
    message:
      "Aquest preu prové de la font gestionada {source}. S'actualitza automàticament i no es pot editar ni suprimir aquí; afegiu la vostra pròpia entrada de preu per a aquesta data per substituir-lo.",
    description:
      "Shown on a price entry that comes from a managed price include. {source} is the feed URL.",
  },
  "journal.pluginCopyExplanation": {
    message:
      "Un connector ha generat aquesta entrada a partir d'una altra, així que no es pot editar ni eliminar aquí. Canvia l'entrada d'origen.",
    description:
      "Shown on an entry a plugin generated as a copy of another one.",
  },
  "journal.openSourceEntry": {
    message: "Obre l'entrada d'origen",
    description: "Link from a plugin copy to the entry it was made from.",
  },
};

export default caJournal;
