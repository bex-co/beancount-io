export interface TranslationEntry {
  message: string;
  description: string;
}

const deJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Konto",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "Konto (z.B. Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Konto ist erforderlich",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "Konten",
    description: "Plural form of account",
  },
  "journal.addNewJournalEntry": {
    message: "Neuen Journaleintrag hinzufügen",
    description: "Aria label for add new journal entry button",
  },
  "journal.amountMustBeNumber": {
    message: "Betrag muss eine gültige Zahl sein",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "Betrag (z.B. 100,00)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "Betrag ist erforderlich",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastTwoPostings": {
    message: "Mindestens zwei Buchungen sind erforderlich",
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
    message: "Salden nach der Buchung",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Salden vor der Buchung",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "B",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Budgeteinträge",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "Änderung",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "Abgeschlossene Transaktionen",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "Schließen",
    description: "Close account entry type filter",
  },
  "journal.createNewJournalEntry": {
    message: "Neuen Journaleintrag für dieses Hauptbuch erstellen",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "Kontoeintrag erstellen",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "Bilanzeintrag erstellen",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "Notizeintrag erstellen",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "Transaktionseintrag erstellen",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "Währung (z.B. EUR)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "Währung ist erforderlich",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "Benutzerdefiniert",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "Datum",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "D",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "Gefundene Dokumente",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Dokument",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message: "Aktuell gefilterte Einträge als Beancount-Datei herunterladen",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "Eintragskontext",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "Eintrag erfolgreich erstellt",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Speicherort:",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "Fehler beim Laden der Journaleinträge",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "Exportieren",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "Journal exportieren",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Wird exportiert...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "Saldoeintrag konnte nicht erstellt werden",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "Notizeintrag konnte nicht erstellt werden",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "Transaktion konnte nicht erstellt werden",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "Journal konnte nicht exportiert werden",
    description: "Error message when journal export fails",
  },
  "journal.journal": {
    message: "Journal",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Journal erfolgreich exportiert",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "L",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Verknüpfte Dokumente",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Eintragskontext wird geladen...",
    description: "Loading message while fetching entry context",
  },
  "journal.metadata": {
    message: "Metadaten",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "Beschreibung",
    description: "Placeholder for narration field",
  },
  "journal.newEntry": {
    message: "Neuer Eintrag",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "Keine Währungen gefunden",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "Keine Journaleinträge für die aktuellen Filter gefunden.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noNarrationsFound": {
    message: "Keine Beschreibungen gefunden",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "Keine Zahlungsempfänger gefunden",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "Notiz",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "Notizinhalt",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Notizinhalt ist erforderlich",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "Eröffnen",
    description: "Open account entry type filter",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "Sonstige Transaktionen",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Ausgleich",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "Zahlungsempfänger/Beschreibung",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Zahlungsempfänger",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Ausstehende Transaktionen",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "Buchungen",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Preis",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "Konto auswählen...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "Saldo-Datum auswählen",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "Währung auswählen...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Beschreibung auswählen...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "Notiz-Datum auswählen",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "Zahlungsempfänger auswählen...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "Metadaten ein-/ausblenden",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "Buchungen ein-/ausblenden",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "Transaktion",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "Transaktionen",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "Einheiten",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "Unbekannter Direktiven-Typ",
    description: "Message shown for unrecognized beancount directive types",
  },
  "journal.sourceModified": {
    message: "Quelle wurde geändert",
    description: "Notice that entry source has unsaved changes",
  },
  "journal.entrySavedSuccess": {
    message: "Eintrag erfolgreich gespeichert",
    description: "Toast shown after saving an entry",
  },
  "journal.entryDeletedSuccess": {
    message: "Eintrag erfolgreich gelöscht",
    description: "Toast shown after deleting an entry",
  },
  "journal.noEntryContext": {
    message: "Keine Eintragskontextdaten verfügbar",
    description: "Empty state for entry context",
  },
  "journal.accumulated": {
    message: "angesammelt",
    description: "Label before an accumulated balance difference",
  },
  "journal.fromAccount": {
    message: "von",
    description: "Label before a pad source account",
  },
  "journal.clearedStatus": {
    message: "Gelöscht",
    description: "Cleared transaction status",
  },
  "journal.pendingStatus": {
    message: "Ausstehend",
    description: "Pending transaction status",
  },
  "journal.blankStatus": {
    message: "(leer)",
    description: "Blank transaction status option",
  },
  "journal.autoAmount": {
    message: "auto",
    description: "Label for an automatically balanced amount",
  },
};

export default deJournal;
