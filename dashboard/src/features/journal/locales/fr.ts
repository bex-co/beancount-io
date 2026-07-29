export interface TranslationEntry {
  message: string;
  description: string;
}

const frJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Compte",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPicker": {
    message: "Sélecteur de compte",
    description: "Dialog or dropdown title for selecting account",
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
  "journal.accountsPlural": {
    message: "comptes",
    description: "Lowercase plural form of accounts",
  },
  "journal.addNewJournalEntry": {
    message: "Ajouter une nouvelle écriture de journal",
    description: "Aria label for add new journal entry button",
  },
  "journal.addPosting": {
    message: "Ajouter une écriture",
    description: "Button text to add a new posting to transaction",
  },
  "journal.addTransaction": {
    message: "Ajouter une transaction",
    description: "Button to add a new transaction",
  },
  "journal.amountEmptyError": {
    message: "Veuillez saisir le montant",
    description: "Validation error when amount is not provided",
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
  "journal.atLeastOnePosting": {
    message: "Au moins une écriture est requise",
    description: "Validation error when no postings exist",
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
  "journal.closeAccount": {
    message: "Fermer un compte",
    description: "Action to close an existing account",
  },
  "journal.cost": {
    message: "Coût",
    description: "Table header for cost column",
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
  "journal.flagPlaceholder": {
    message: "Indicateur (ex: *)",
    description: "Placeholder for transaction flag",
  },
  "journal.from": {
    message: "De",
    description: "Label for source account in transaction",
  },
  "journal.journal": {
    message: "Journal",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Journal exporté avec succès",
    description: "Success message after exporting journal",
  },
  "journal.journalLoadError": {
    message: "Échec du chargement du journal : ",
    description: "Error message prefix when journal fails to load",
  },
  "journal.journalWelcomeInstruction1": {
    message:
      'Utilisez le bouton "Ajouter une transaction" pour créer des écritures',
    description: "First instruction for getting started",
  },
  "journal.journalWelcomeInstruction2": {
    message: "Téléversez des fichiers beancount via l'interface web",
    description: "Second instruction for getting started",
  },
  "journal.journalWelcomeInstruction3": {
    message: "Importez des données comptables existantes",
    description: "Third instruction for getting started",
  },
  "journal.journalWelcomeInstructionFinal": {
    message:
      "Une fois que vous aurez ajouté des transactions, elles apparaîtront ici.",
    description: "Final instruction message",
  },
  "journal.journalWelcomeInstructions": {
    message: "Pour commencer :",
    description: "Header for getting started instructions",
  },
  "journal.journalWelcomeMessage": {
    message: "Vous n'avez pas encore d'entrées de journal.",
    description: "Welcome message for empty journal",
  },
  "journal.journalWelcomeTitle": {
    message: "Bienvenue dans votre Journal ! 📔",
    description: "Welcome title for empty journal page",
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
  "journal.loadingMore": {
    message: "Chargement en cours...",
    description: "Loading message when fetching more entries",
  },
  "journal.metadata": {
    message: "Métadonnées",
    description: "Label for metadata toggle filter",
  },
  "journal.narration": {
    message: "Libellé",
    description: "Label for transaction description/notes field",
  },
  "journal.narrationPlaceholder": {
    message: "Libellé",
    description: "Placeholder for narration field",
  },
  "journal.narrationRequired": {
    message: "Le libellé est requis",
    description: "Validation error when narration is missing",
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
  "journal.noMoreEntries": {
    message: "Aucune autre entrée",
    description: "Message when no more entries to load",
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
  "journal.openAccount": {
    message: "Ouvrir un compte",
    description: "Action to open a new account",
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
  "journal.payee": {
    message: "Bénéficiaire",
    description: "Label for payee field in transaction",
  },
  "journal.payeeNarration": {
    message: "Bénéficiaire/Libellé",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Bénéficiaire",
    description: "Placeholder for payee field",
  },
  "journal.payeeRequired": {
    message: "Le bénéficiaire est requis",
    description: "Validation error when payee is missing",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Transactions en attente",
    description: "Filter tooltip for pending transactions",
  },
  "journal.pleaseInput": {
    message: "Veuillez saisir...",
    description: "Placeholder text prompting user to input",
  },
  "journal.posting": {
    message: "Écriture",
    description: "Label for posting section in transaction form",
  },
  "journal.postings": {
    message: "Écritures",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Prix",
    description: "Price entry type filter",
  },
  "journal.priceHeader": {
    message: "Prix",
    description: "Table header for price column",
  },
  "journal.quickAdd": {
    message: "Ajout rapide",
    description: "Button for quick transaction entry",
  },
  "journal.saveFailed": {
    message: "Échec de l'enregistrement",
    description: "Error message when save fails",
  },
  "journal.saveSuccess": {
    message: "Transaction enregistrée !",
    description: "Success message after saving transaction",
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
  "journal.selectTransactionDate": {
    message: "Sélectionner la date de transaction",
    description: "Placeholder for date picker",
  },
  "journal.to": {
    message: "À",
    description: "Label for destination account in transaction",
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
