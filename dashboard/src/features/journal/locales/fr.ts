export interface TranslationEntry {
  message: string;
  description: string;
}

const frJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Compte",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "Compte (e.g., Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Compte is required",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "Comptes",
    description: "Plural form of account",
  },
  "journal.addNewJournalEntry": {
    message: "Ajouter une nouvelle écriture de journal",
    description: "Aria label for add new journal entry button",
  },
  "journal.amountMustBeNumber": {
    message: "Le montant doit être un nombre valide",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "Montant (ex: 100.00)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "Le montant est requis",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastTwoPostings": {
    message: "Au moins deux écritures sont requises",
    description: "Validation error when less than two postings exist",
  },
  "journal.balance": {
    message: "Solde",
    description: "Balance entry type",
  },
  "journal.balanceHeader": {
    message: "Solde",
    description: "Table header for balance column",
  },
  "journal.balancesAfterEntry": {
    message: "Soldes après l'écriture",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Soldes avant l'écriture",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "B",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Écritures budgétaires",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "Variation",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "Transactions validées",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "Fermer",
    description: "Close account entry type filter",
  },
  "journal.createNewJournalEntry": {
    message: "Créer une nouvelle écriture de journal pour ce grand livre",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "Créer une écriture de compte",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "Créer une écriture de bilan",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "Créer une écriture de note",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "Créer une écriture de transaction",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "Devise (ex: USD)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "La devise est requise",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "Personnalisé",
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
    message: "Documents découverts",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Document",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message:
      "Télécharger les écritures actuellement filtrées sous forme de fichier Beancount",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "Contexte de l'écriture",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "Écriture créée avec succès",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Emplacement :",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "Erreur lors du chargement des écritures de journal",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "Exporter",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "Exporter le journal",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Exportation en cours...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "Échec de la création de l'écriture de solde",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "Échec de la création de la note",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "Échec de la création de la transaction",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "Échec de l'exportation du journal",
    description: "Error message when journal export fails",
  },
  "journal.journal": {
    message: "Journal",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Journal exporté avec succès",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "L",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Documents liés",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Chargement du contexte de l'écriture...",
    description: "Loading message while fetching entry context",
  },
  "journal.metadata": {
    message: "Métadonnées",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "Libellé",
    description: "Placeholder for narration field",
  },
  "journal.newEntry": {
    message: "Nouvelle écriture",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "Aucune devise trouvée",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "Aucune écriture de journal trouvée pour les filtres actuels.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noNarrationsFound": {
    message: "Aucun libellé trouvé",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "Aucun bénéficiaire trouvé",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "Note",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "Contenu de la note",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Le contenu de la note est requis",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "Ouverture",
    description: "Open account entry type filter",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "Autres transactions",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Ajustement",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "Bénéficiaire/Libellé",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Bénéficiaire",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Transactions en attente",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "Écritures",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Prix",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "Sélectionner un compte...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "Sélectionner la date du solde",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "Sélectionner une devise...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Sélectionner un libellé...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "Sélectionner la date de la note",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "Sélectionner un bénéficiaire...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "Basculer les métadonnées",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "Basculer les écritures",
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
    message: "Unités",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "Type de directive inconnu",
    description: "Message shown for unrecognized beancount directive types",
  },
};

export default frJournal;
