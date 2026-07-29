export interface TranslationEntry {
  message: string;
  description: string;
}

const dePlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.connectedSuccessfully": {
    message: "✓ Erfolgreich Verbunden",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "Banksynchronisierung",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "Konto verbinden",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message:
      "Importieren Sie Transaktionen automatisch mit sicherer Verschlüsselung auf Bankniveau",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "Optimieren Sie Ihren Buchhaltungsworkflow",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "Verbinden Sie Ihre Bankkonten über Plaid, um Transaktionen automatisch zu importieren, Stunden manueller Dateneingabe zu sparen und Ihr Hauptbuch in Echtzeit auf dem neuesten Stand zu halten.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "Über 11.000 Institutionen",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "Sicherheit auf Bankniveau",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "Echtzeit-Synchronisation",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "Jetzt Starten",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "Warum Ihre Bank Verbinden?",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "Automatischer Import",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "Sparen Sie Stunden manueller Eingabe, indem Sie Transaktionen automatisch von Ihren Bankkonten in Echtzeit importieren. Konzentrieren Sie sich auf die Analyse, nicht auf die Dateneingabe.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "Sicherheit auf Bankniveau",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid verwendet 256-Bit-Verschlüsselung und wird von Tausenden von Finanzinstituten vertraut. Ihre Anmeldedaten werden niemals auf unseren Servern gespeichert.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "Datenschutz Zuerst",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "Wir speichern niemals Ihre Bankanmeldedaten oder verkaufen Ihre Daten. Ihre Finanzinformationen sind durch branchenführende Datenschutzstandards geschützt.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "So Funktioniert's",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "Verbinden Sie Ihr Bankkonto in nur wenigen einfachen Schritten",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "Wählen Sie Ihre Bank",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message: "Suchen Sie aus über 11.000 unterstützten Finanzinstituten",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "Sichere Authentifizierung",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message:
      "Melden Sie sich sicher über das Authentifizierungssystem Ihrer Bank an",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "Import Starten",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message:
      "Ihre Transaktionen werden automatisch mit Ihrem Hauptbuch synchronisiert",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "Weitere Bank Verbinden",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "Bank Verbinden",
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
    message: "Keine Banken Verbunden",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message:
      "Verbinden Sie eine Bank, um Transaktionen automatisch zu importieren.",
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
    message: "Verknüpft am {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "Aktiv",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "Neuauthentifizierung Erforderlich",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "Deaktiviert",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "Zuletzt synchronisiert",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount": {
    message: "{count} Transaktionen",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "Fehlgeschlagen",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "Verbinde Neu...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "Bank Neu Verbinden",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "Trenne Verbindung...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "Verbindung Trennen",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "Bankkonto Trennen",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "Sind Sie sicher, dass Sie {institutionName} trennen möchten? Dies entfernt alle verbundenen Konten und stoppt die automatische Transaktionssynchronisation.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "Abbrechen",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "Bank Getrennt",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "{institutionName} wurde getrennt.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "Fehler",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "Bankkonto konnte nicht getrennt werden.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message:
      "Wählen Sie ein Bankkonto aus, um Kontozuordnungen zu konfigurieren",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "Keine Konten für diese Bank gefunden",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "Konten verwalten",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "Von dieser Bank freigegebene Konten hinzufügen oder entfernen",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "Verbinden Sie diese Bank zuerst erneut",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "Konten hinzufügen",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "Konten werden aktualisiert …",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "Wird vorbereitet …",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "Warten auf Ihre Bank …",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "Änderungen werden übernommen …",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "Konten aktualisiert",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "{added} hinzugefügt, {removed} entfernt.",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "Keine Kontoänderungen",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "Nichts hat sich geändert. Manche Banken lassen die Auswahl der freigegebenen Konten nur in ihrer eigenen App oder Website zu.",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "Konten konnten nicht aktualisiert werden",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message:
      "Ihre Bank hat die Änderung möglicherweise gespeichert. Öffnen Sie „Konten verwalten“ erneut, um es noch einmal zu versuchen.",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "Kontoänderungen abgebrochen",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "Plaid Link wurde geschlossen, ohne Konten zu ändern.",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "Konten",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.mapped": {
    message: "Zugeordnet",
    description: "Badge text for mapped account",
  },
  "plaid.accountMapping.currency": {
    message: "Währung",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Beancount-Konto",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "Speichere...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "Speichern",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "Abbrechen",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "Nicht zugeordnet",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "Bearbeiten",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "Zuordnung Festlegen",
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
    message: "Ungültiges Konto",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "Bitte geben Sie einen gültigen Beancount-Kontonamen ein.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "Zuordnung Gespeichert",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} zu {ledgerAccount} zugeordnet ({currency})",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "Fehler",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "Kontozuordnung konnte nicht gespeichert werden.",
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
    message: "Keine Banktransaktionen",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message:
      "Alle Transaktionen wurden mit Ihrem Hauptbuch synchronisiert oder es gibt keine neuen Transaktionen.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "Banktransaktionen",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message:
      "Überprüfen und übermitteln Sie {count} Transaktion{plural} an Ihr Hauptbuch",
    description:
      "Card description - interpolation: {count} for number, {plural} for 's' or empty",
  },
  "plaid.transactionReview.submitting": {
    message: "Übermittle...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "Übermitteln",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "Nach Händler oder Beschreibung suchen...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "Nach Bank filtern",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "Alle Banken",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "Nach Bankkonto filtern",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "Alle Bankkonten",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected": {
    message: "{count} Konten ausgewählt",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "Keine Transaktionen entsprechen den aktuellen Filtern.",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "Filter zurücksetzen",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message:
      "{count} ausgewählte Transaktion(en) sind durch die aktuellen Filter ausgeblendet, werden aber trotzdem übertragen oder gelöscht.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count}",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "Zieldatei für den Import wählen",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message:
      "{count} ausgewählte Transaktion(en) benötigen Zielkonten vor der Übermittlung.",
    description:
      "Alert message for missing target accounts - interpolation: {count}",
  },
  "plaid.transactionReview.selectAll": {
    message: "Alle auswählen",
    description: "Checkbox label to select all transactions",
  },
  "plaid.transactionReview.date": {
    message: "Datum",
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
    message: "Händler",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "Beschreibung",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "Betrag",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "Zielkonto",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "KI...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "KI-Ausfüllung",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "Konto auswählen...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "Kategorisierung Abgeschlossen",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription": {
    message: "KI hat Konten für {count} Transaktionen vorgeschlagen.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "Kategorisierung Fehlgeschlagen",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message:
      "Transaktionen konnten nicht kategorisiert werden. Bitte versuchen Sie es erneut.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "Keine Transaktionen Ausgewählt",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message:
      "Bitte wählen Sie mindestens eine Transaktion zum Übermitteln aus.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "Fehlende Zielkonten",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message: "{count} ausgewählte Transaktion(en) benötigen Zielkonten.",
    description:
      "Toast description for missing accounts - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "Transaktionen Übermittelt",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription": {
    message: "{count} Transaktionen zu Ihrem Hauptbuch hinzugefügt.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "Übermittlung Fehlgeschlagen",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message:
      "Transaktionen konnten nicht übermittelt werden. Bitte versuchen Sie es erneut.",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "[TODO] Delete",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "[TODO] Deleting...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "[TODO] Delete Transactions?",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message:
      "[TODO] This will permanently remove {count} selected transaction(s) from this list. This cannot be undone.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "[TODO] Transactions Deleted",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "[TODO] {count} transaction(s) removed from this list.",
    description:
      "Toast description for deleted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "[TODO] Deletion Failed",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "[TODO] Failed to delete transactions. Please try again.",
    description: "Toast description for deletion failure",
  },
};

export default dePlaid;
