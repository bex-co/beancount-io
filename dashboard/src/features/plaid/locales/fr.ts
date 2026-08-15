export interface TranslationEntry {
  message: string;
  description: string;
}

const frPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.connectedSuccessfully": {
    message: "✓ Connecté avec Succès",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "Synchronisation bancaire",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "Connecter un compte",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message:
      "Importez automatiquement les transactions avec un chiffrement de niveau bancaire",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "Optimisez Votre Flux de Travail Comptable",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "Connectez vos comptes bancaires via Plaid pour importer automatiquement les transactions, économiser des heures de saisie manuelle et maintenir votre livre de comptes à jour en temps réel.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "Plus de 11 000 institutions",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "Sécurité de niveau bancaire",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "Synchronisation en temps réel",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "Commencer",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "Pourquoi Connecter Votre Banque ?",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "Importation Automatique",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "Économisez des heures de saisie manuelle en important automatiquement les transactions de vos comptes bancaires en temps réel. Concentrez-vous sur l'analyse, pas sur la saisie de données.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "Sécurité de Niveau Bancaire",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid utilise un chiffrement 256 bits et est approuvé par des milliers d'institutions financières. Vos identifiants ne sont jamais stockés sur nos serveurs.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "La Confidentialité d'Abord",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "Nous ne stockons jamais vos identifiants bancaires et ne vendons pas vos données. Vos informations financières sont protégées par des normes de confidentialité de pointe.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "Comment Ça Marche",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "Connectez votre compte bancaire en quelques étapes simples",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "Sélectionnez Votre Banque",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message:
      "Recherchez parmi plus de 11 000 institutions financières prises en charge",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "Authentification Sécurisée",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message:
      "Connectez-vous en toute sécurité via le système d'authentification de votre banque",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "Commencer l'Importation",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message:
      "Vos transactions se synchroniseront automatiquement avec votre livre de comptes",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "Connecter une Autre Banque",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "Connecter une Banque",
    description:
      "Button text to connect a bank, shown on the connections page when no bank is connected yet",
  },
  "plaid.management.connectionsTitle": {
    message: "Bank Connections",
    description: "Section title for the list of connected banks",
  },
  "plaid.management.connectionsSubtitle": {
    message: "Manage account mappings, sync, and disconnect banks.",
    description: "Section subtitle for the list of connected banks",
  },
  "plaid.management.noConnectionsTitle": {
    message: "Aucune Banque Connectée",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message:
      "Connectez une banque pour importer automatiquement vos transactions.",
    description:
      "Empty state description on the connections page when no bank is connected",
  },
  "plaid.management.sync": {
    message: "Sync",
    description: "Button text to sync transactions across every connected bank",
  },
  "plaid.management.syncing": {
    message: "Syncing...",
    description: "Button text while syncing every connected bank",
  },
  "plaid.management.manageBanks": {
    message: "Manage Banks",
    description:
      "Button text linking to the dedicated bank-connection management page",
  },
  "plaid.management.backToTransactions": {
    message: "Back to Transactions",
    description:
      "Back button text on the manage-banks page, returning to the transaction review page",
  },
  "plaid.management.toast.error": {
    message: "Error",
    description: "Generic error toast title",
  },
  "plaid.management.toast.syncAllComplete": {
    message: "Sync Complete",
    description: "Toast title after syncing every connected bank",
  },
  "plaid.management.toast.syncAllCompleteDescription": {
    message:
      "{count} new transaction(s) synced across {institutionCount} bank(s).",
    description:
      "Toast description after syncing every connected bank - interpolation: {count}, {institutionCount}",
  },
  "plaid.management.toast.syncAllSkipped": {
    message: "{count} bank(s) need reconnecting",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count}",
  },
  "plaid.management.toast.syncAllFailedDescription": {
    message: "Failed to sync transactions. Please try again.",
    description: "Toast description when Sync All fails",
  },

  // Bank Account List
  "plaid.bankAccount.linkedOn": {
    message: "Lié le {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "Actif",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "Réauthentification Requise",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "Désactivé",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "Dernière synchronisation",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount": {
    message: "{count} transactions",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "Échec",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "Reconnexion...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "Reconnecter la Banque",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "Déconnexion...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "Déconnecter",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "Déconnecter le Compte Bancaire",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "Êtes-vous sûr de vouloir déconnecter {institutionName} ? Cela supprimera tous les comptes connectés et arrêtera la synchronisation automatique des transactions.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "Annuler",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "Banque Déconnectée",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "{institutionName} a été déconnecté.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "Erreur",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "Échec de la déconnexion du compte bancaire.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message:
      "Sélectionnez un compte bancaire pour configurer les mappages de comptes",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "Aucun compte trouvé pour cette banque",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "Gérer les comptes",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "Ajouter ou supprimer des comptes partagés par cette banque",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "Reconnectez d'abord cette banque",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "Ajouter des comptes",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "Mise à jour des comptes...",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "Préparation...",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "En attente de votre banque...",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "Application des modifications...",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "Comptes mis à jour",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "{added} ajouté(s), {removed} supprimé(s).",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "Aucune modification de compte",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "Rien n'a changé. Certaines banques ne permettent de modifier les comptes partagés que depuis leur propre application ou site web.",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "Impossible de mettre à jour les comptes",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message:
      "Votre banque a peut-être enregistré la modification. Rouvrez Gérer les comptes pour réessayer.",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "Modifications des comptes annulées",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "Plaid Link a été fermé sans modifier de compte.",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "Comptes",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.currency": {
    message: "Devise",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Compte Beancount",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "Enregistrement...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "Enregistrer",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "Annuler",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "Non mappé",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "Modifier",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "Définir le Mappage",
    description: "Button text to set mapping for unmapped account",
  },
  "plaid.accountMapping.aiSuggested": {
    message: "AI suggested",
    description: "Badge/hint shown next to an AI-prefilled account mapping",
  },
  "plaid.accountMapping.suggestedAccount": {
    message: "AI suggests: {account}",
    description:
      "Inline hint showing the AI-suggested account for an unmapped account - interpolation: {account}",
  },
  "plaid.accountMapping.suggesting": {
    message: "Getting AI suggestions...",
    description: "Loading label while AI mapping suggestions are fetched",
  },
  "plaid.accountMapping.acceptAllSuggestions": {
    message: "Accept All Suggestions ({count})",
    description:
      "Button text to accept every AI-suggested mapping at once - interpolation: {count}",
  },
  "plaid.accountMapping.accepting": {
    message: "Accepting...",
    description: "Button text while accepting all suggestions",
  },

  // Account Mapping - Toast Messages
  "plaid.accountMapping.toast.invalidAccount": {
    message: "Compte Invalide",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "Veuillez entrer un nom de compte Beancount valide.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "Mappage Enregistré",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} mappé à {ledgerAccount} ({currency})",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "Erreur",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "Échec de l'enregistrement du mappage de compte.",
    description: "Toast description for save error",
  },
  "plaid.accountMapping.toast.acceptedAll": {
    message: "Suggestions Accepted",
    description: "Toast title after accepting all AI mapping suggestions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription": {
    message: "Mapped {count} account(s) using AI suggestions.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count}",
  },

  // Account Detail Page

  // Transaction Review Table
  "plaid.transactionReview.noPendingTitle": {
    message: "Aucune Transaction Bancaire",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message:
      "Toutes les transactions ont été synchronisées avec votre livre de comptes ou il n'y a pas de nouvelles transactions.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "Transactions Bancaires",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message:
      "Examinez et soumettez {count} transaction{plural} à votre livre de comptes",
    description:
      "Card description - interpolation: {count} for number, {plural} for 's' or empty",
  },
  "plaid.transactionReview.submitting": {
    message: "Soumission...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "Soumettre",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "Rechercher par commerçant ou description...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "Filtrer par banque",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "Toutes les banques",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "Filtrer par compte bancaire",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "Tous les comptes bancaires",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected": {
    message: "{count} comptes sélectionnés",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "Aucune transaction ne correspond aux filtres actuels.",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "Effacer les filtres",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message:
      "{count} transaction(s) sélectionnée(s) sont masquées par les filtres actuels, mais seront tout de même soumises ou supprimées.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count}",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "Choisissez dans quel fichier importer",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message:
      "{count} transaction(s) sélectionnée(s) nécessite(nt) des comptes cibles avant la soumission.",
    description:
      "Alert message for missing target accounts - interpolation: {count}",
  },
  "plaid.transactionReview.selectAll": {
    message: "Tout sélectionner",
    description: "Checkbox label to select all transactions",
  },
  "plaid.transactionReview.date": {
    message: "Date",
    description: "Table header for date column",
  },
  "plaid.transactionReview.source": {
    message: "Bank",
    description: "Table header for the source institution/account column",
  },
  "plaid.transactionReview.sourceAccount": {
    message: "Source Account",
    description:
      "Table header for the editable Beancount source-account column, defaults from the account mapping",
  },
  "plaid.transactionReview.merchant": {
    message: "Commerçant",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "Description",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "Montant",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "Compte Cible",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "IA...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "Remplissage IA",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "Sélectionner un compte...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "Catégorisation Terminée",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription": {
    message: "L'IA a suggéré des comptes pour {count} transactions.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "Échec de la Catégorisation",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message: "Échec de la catégorisation des transactions. Veuillez réessayer.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "Aucune Transaction Sélectionnée",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "Veuillez sélectionner au moins une transaction à soumettre.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "Comptes Cibles Manquants",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message:
      "{count} transaction(s) sélectionnée(s) nécessite(nt) des comptes cibles.",
    description:
      "Toast description for missing accounts - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "Transactions Soumises",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription": {
    message: "{count} transactions ajoutées à votre livre de comptes.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "Échec de la Soumission",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "Échec de la soumission des transactions. Veuillez réessayer.",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "Supprimer",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "Suppression...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "Supprimer les transactions ?",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message:
      "Cette action supprimera définitivement de cette liste les {count} transactions sélectionnées. Cette opération est irréversible.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "Transactions supprimées",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "{count} transactions ont été supprimées de cette liste.",
    description:
      "Toast description for deleted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "Échec de la suppression",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "Impossible de supprimer les transactions. Réessayez.",
    description: "Toast description for deletion failure",
  },
};

export default frPlaid;
