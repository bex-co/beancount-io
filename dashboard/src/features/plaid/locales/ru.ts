export interface TranslationEntry {
  message: string;
  description: string;
}

const ruPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.connectedSuccessfully": {
    message: "✓ Connected Successfully",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "Банковская синхронизация",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "Подключить счёт",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message:
      "Automatically import transactions with secure bank-level encryption",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "Streamline Your Accounting Workflow",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "Connect your bank accounts through Plaid to automatically import transactions, save hours of manual data entry, and keep your ledger up-to-date in real-time.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "11,000+ institutions",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "Bank-level security",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "Real-time sync",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "Get Started",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "Why Connect Your Bank?",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "Automatic Import",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "Save hours of manual entry by automatically importing transactions from your bank accounts in real-time. Focus on analysis, not data entry.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "Bank-Level Security",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid uses 256-bit encryption and is trusted by thousands of financial institutions. Your credentials are never stored on our servers.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "Privacy First",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "We never store your bank credentials or sell your data. Your financial information is protected by industry-leading privacy standards.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "How It Works",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "Connect your bank account in just a few simple steps",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "Select Your Bank",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message: "Search from over 11,000 supported financial institutions",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "Secure Authentication",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message: "Log in securely through your bank's authentication system",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "Start Importing",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message: "Your transactions will automatically sync to your ledger",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "Connect Another Bank",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "Подключить банк",
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
    message: "Нет подключённых банков",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message: "Подключите банк, чтобы автоматически импортировать транзакции.",
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
    message: "Linked on {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "Active",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "Reauth Required",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "Disabled",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "Last synced",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount": {
    message: "{count} transactions",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "Failed",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "Reconnecting...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "Reconnect Bank",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "Disconnecting...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "Disconnect",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "Disconnect Bank Account",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "Are you sure you want to disconnect {institutionName}? This will remove all connected accounts and stop automatic transaction syncing.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "Cancel",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "Bank Disconnected",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "{institutionName} has been disconnected.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "Error",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "Failed to disconnect bank account.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message: "Select a bank account to configure account mappings",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "No accounts found for this bank",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "Управление счетами",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "Добавьте или удалите счета, которыми делится этот банк",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "Сначала переподключите этот банк",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "Добавить счета",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "Обновление счетов...",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "Подготовка...",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "Ожидание ответа банка...",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "Применение изменений...",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "Счета обновлены",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "Добавлено: {added}, удалено: {removed}.",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "Изменений в счетах нет",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "Ничего не изменилось. Некоторые банки позволяют менять список общих счетов только в своём приложении или на сайте.",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "Не удалось обновить счета",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message:
      "Возможно, банк сохранил изменение. Откройте «Управление счетами» ещё раз и повторите попытку.",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "Изменение счетов отменено",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "Plaid Link закрыт без изменения счетов.",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "Счета",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.currency": {
    message: "Currency",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Beancount Account",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "Saving...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "Save",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "Cancel",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "Not mapped",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "Edit",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "Set Mapping",
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
    message: "Invalid Account",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "Please enter a valid Beancount account name.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "Mapping Saved",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} mapped to {ledgerAccount} ({currency})",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "Error",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "Failed to save account mapping.",
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
    message: "Нет банковских транзакций",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message:
      "All transactions have been synced to your ledger or there are no new transactions.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "Банковские транзакции",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message: "Review and submit {count} transaction{plural} to your ledger",
    description:
      "Card description - interpolation: {count} for number, {plural} for 's' or empty",
  },
  "plaid.transactionReview.submitting": {
    message: "Submitting...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "Submit",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "Search by merchant or description...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "Фильтр по банку",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "Все банки",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "Фильтр по банковскому счёту",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "Все банковские счета",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected": {
    message: "Выбрано счетов: {count}",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "Нет транзакций, соответствующих текущим фильтрам.",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "Сбросить фильтры",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message:
      "Выбранных транзакций скрыто текущими фильтрами: {count}. Они всё равно будут отправлены или удалены.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count}",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "Выберите, в какой файл импортировать",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message:
      "{count} selected transaction(s) need target accounts before submission.",
    description:
      "Alert message for missing target accounts - interpolation: {count}",
  },
  "plaid.transactionReview.selectAll": {
    message: "Select all",
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
    message: "Merchant",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "Description",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "Amount",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "Target Account",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "AI...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "AI Fill",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "Select account...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "Categorization Complete",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription": {
    message: "AI suggested accounts for {count} transactions.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "Categorization Failed",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message: "Failed to categorize transactions. Please try again.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "No Transactions Selected",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "Please select at least one transaction to submit.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "Missing Target Accounts",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message: "{count} selected transaction(s) need target accounts.",
    description:
      "Toast description for missing accounts - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "Transactions Submitted",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription": {
    message: "{count} transactions added to your ledger.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "Submission Failed",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "Failed to submit transactions. Please try again.",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "Удалить",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "Удаление...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "Удалить транзакции?",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message:
      "Выбранные транзакции ({count}) будут навсегда удалены из этого списка. Это действие нельзя отменить.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "Транзакции удалены",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "Из этого списка удалено транзакций: {count}.",
    description:
      "Toast description for deleted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "Не удалось удалить",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "Не удалось удалить транзакции. Повторите попытку.",
    description: "Toast description for deletion failure",
  },
};

export default ruPlaid;
