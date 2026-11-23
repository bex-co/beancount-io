export interface TranslationEntry {
  message: string;
  description: string;
}

const caPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.pageTitle": {
    message: "Comptes connectats",
    description:
      "Page heading for ledger bank connections and imported transactions",
  },
  "plaid.access.adminOnly": {
    message:
      "Només el propietari del llibre comptable o un administrador pot connectar i gestionar bancs.",
    description:
      "Notice shown when the viewer cannot administer ledger bank connections",
  },
  "plaid.connectedSuccessfully": {
    message: "✓ Connectat correctament",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "Sincronització bancària",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "Connecta un compte",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message:
      "Importa transaccions automàticament amb xifratge segur de nivell bancari",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "Simplifica el teu flux de treball comptable",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "Connecta els teus comptes bancaris a través de Plaid per importar transaccions automàticament, estalviar hores d'entrada manual de dades i mantenir el teu llibre major actualitzat en temps real.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "Més d'11.000 institucions",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "Seguretat de nivell bancari",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "Sincronització en temps real",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "Comença",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "Per què connectar el teu banc?",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "Importació automàtica",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "Estalvia hores d'entrada manual important automàticament les transaccions dels teus comptes bancaris en temps real. Centra't en l'anàlisi, no en l'entrada de dades.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "Seguretat de nivell bancari",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid utilitza xifratge de 256 bits i milers d'institucions financeres hi confien. Les teves credencials mai no s'emmagatzemen als nostres servidors.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "La privadesa, primer",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "Mai no emmagatzemem les teves credencials bancàries ni venem les teves dades. La teva informació financera està protegida per estàndards de privadesa líders del sector.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "Com funciona",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "Connecta el teu compte bancari en uns quants passos senzills",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "Selecciona el teu banc",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message: "Cerca entre més d'11.000 institucions financeres compatibles",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "Autenticació segura",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message:
      "Inicia sessió de manera segura mitjançant el sistema d'autenticació del teu banc",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "Comença a importar",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message:
      "Les teves transaccions se sincronitzaran automàticament amb el teu llibre major",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "Connecta un altre banc",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "Connecta un banc",
    description:
      "Button text to connect a bank, shown on the connections page when no bank is connected yet",
  },
  "plaid.management.connectionsTitle": {
    message: "Connexions bancàries",
    description: "Section title for the list of connected banks",
  },
  "plaid.management.connectionsSubtitle": {
    message:
      "Gestiona les assignacions de comptes, sincronitza i desconnecta bancs.",
    description: "Section subtitle for the list of connected banks",
  },
  "plaid.management.noConnectionsTitle": {
    message: "Cap banc connectat",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message: "Connecta un banc per importar transaccions automàticament.",
    description:
      "Empty state description on the connections page when no bank is connected",
  },
  "plaid.management.sync": {
    message: "Sincronitza",
    description: "Button text to sync transactions across every connected bank",
  },
  "plaid.management.syncing": {
    message: "S'està sincronitzant...",
    description: "Button text while syncing every connected bank",
  },
  "plaid.management.manageBanks": {
    message: "Gestiona els bancs",
    description:
      "Button text linking to the dedicated bank-connection management page",
  },
  "plaid.management.backToTransactions": {
    message: "Torna a les transaccions",
    description:
      "Back button text on the manage-banks page, returning to the transaction review page",
  },
  "plaid.management.toast.error": {
    message: "Error",
    description: "Generic error toast title",
  },
  "plaid.management.toast.syncAllComplete": {
    message: "Sincronització completada",
    description: "Toast title after syncing every connected bank",
  },
  "plaid.management.toast.syncAllCompleteDescription": {
    message: "{transactions} des de {banks}.",
    description:
      "Toast description after syncing every connected bank - interpolation: {transactions} is plaid.management.toast.syncAllTransactionsPart, {banks} is plaid.management.toast.syncAllBanksPart; each fragment is pluralized on its own count",
  },
  "plaid.management.toast.syncAllTransactionsPart": {
    message: "{count} transaccions noves sincronitzades",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllTransactionsPart_one": {
    message: "{count} transacció nova sincronitzada",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllTransactionsPart_many": {
    message: "{count} transaccions noves sincronitzades",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.management.toast.syncAllTransactionsPart_other": {
    message: "{count} transaccions noves sincronitzades",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllBanksPart": {
    message: "{count} bancs",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllBanksPart_one": {
    message: "{count} banc",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllBanksPart_many": {
    message: "{count} bancs",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.management.toast.syncAllBanksPart_other": {
    message: "{count} bancs",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllSkipped": {
    message: "Cal tornar a connectar {count} bancs",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllSkipped_one": {
    message: "Cal tornar a connectar {count} banc",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllSkipped_many": {
    message: "Cal tornar a connectar {count} bancs",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.management.toast.syncAllSkipped_other": {
    message: "Cal tornar a connectar {count} bancs",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllFailedDescription": {
    message: "No s'han pogut sincronitzar les transaccions. Torna-ho a provar.",
    description: "Toast description when Sync All fails",
  },

  // Bank Account List
  "plaid.bankAccount.linkedOn": {
    message: "Enllaçat el {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "Actiu",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "Cal tornar a autenticar",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "Desactivat",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "Última sincronització",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount_one": {
    message: "{count} transacció",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_many": {
    message: "{count} transaccions",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_other": {
    message: "{count} transaccions",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "Ha fallat",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "S'està tornant a connectar...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "Torna a connectar el banc",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "S'està desconnectant...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "Desconnecta",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "Desconnecta el compte bancari",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "Segur que vols desconnectar {institutionName}? S'eliminaran tots els comptes connectats i s'aturarà la sincronització automàtica de transaccions.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "Cancel·la",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "Banc desconnectat",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "S'ha desconnectat {institutionName}.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "Error",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "No s'ha pogut desconnectar el compte bancari.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message:
      "Selecciona un compte bancari per configurar les assignacions de comptes",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "No s'ha trobat cap compte per a aquest banc",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "Gestiona els comptes",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "Afegeix o elimina comptes compartits per aquest banc",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "Torna a connectar aquest banc primer",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "Afegeix comptes",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "S'estan actualitzant els comptes...",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "S'està preparant...",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "S'està esperant el teu banc...",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "S'estan aplicant els canvis...",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "Comptes actualitzats",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "{added} afegits, {removed} eliminats.",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "Cap canvi als comptes",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "No ha canviat res. Alguns bancs només permeten canviar quins comptes es comparteixen des de la seva pròpia aplicació o lloc web.",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "No s'han pogut actualitzar els comptes",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message:
      "És possible que el teu banc hagi desat el canvi. Torna a obrir Gestiona els comptes per provar-ho de nou.",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "Canvis de comptes cancel·lats",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "Plaid Link s'ha tancat sense canviar cap compte.",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "Comptes",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.currency": {
    message: "Moneda",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Compte de Beancount",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "S'està desant...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "Desa",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "Cancel·la",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "Sense assignar",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "Edita",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "Defineix l'assignació",
    description: "Button text to set mapping for unmapped account",
  },
  "plaid.accountMapping.aiSuggested": {
    message: "Suggerit per la IA",
    description: "Badge/hint shown next to an AI-prefilled account mapping",
  },
  "plaid.accountMapping.suggestedAccount": {
    message: "La IA suggereix: {account}",
    description:
      "Inline hint showing the AI-suggested account for an unmapped account - interpolation: {account}",
  },
  "plaid.accountMapping.suggesting": {
    message: "S'estan obtenint suggeriments de la IA...",
    description: "Loading label while AI mapping suggestions are fetched",
  },
  "plaid.accountMapping.acceptAllSuggestions": {
    message: "Accepta tots els suggeriments ({count})",
    description:
      "Button text to accept every AI-suggested mapping at once - interpolation: {count}",
  },
  "plaid.accountMapping.accepting": {
    message: "S'està acceptant...",
    description: "Button text while accepting all suggestions",
  },

  // Account Mapping - Toast Messages
  "plaid.accountMapping.toast.invalidAccount": {
    message: "Compte no vàlid",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "Introdueix un nom de compte de Beancount vàlid.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "Assignació desada",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} assignat a {ledgerAccount} ({currency})",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "Error",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "No s'ha pogut desar l'assignació del compte.",
    description: "Toast description for save error",
  },
  "plaid.accountMapping.toast.acceptedAll": {
    message: "Suggeriments acceptats",
    description: "Toast title after accepting all AI mapping suggestions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription": {
    message: "S'han assignat {count} comptes amb els suggeriments de la IA.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_one": {
    message: "S'ha assignat {count} compte amb els suggeriments de la IA.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - singular form",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_many": {
    message: "S'han assignat {count} comptes amb els suggeriments de la IA.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_other": {
    message: "S'han assignat {count} comptes amb els suggeriments de la IA.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - plural form",
  },

  // Account Detail Page

  // Transaction Review Table
  "plaid.transactionReview.noPendingTitle": {
    message: "Cap transacció bancària",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message:
      "Totes les transaccions s'han sincronitzat amb el teu llibre major o no hi ha transaccions noves.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "Transaccions bancàries",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message: "Revisa i envia {count} moviments bancaris al teu llibre major",
    description:
      "Card description for the transaction review table - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.description_one": {
    message: "Revisa i envia {count} moviment bancari al teu llibre major",
    description:
      "Card description for the transaction review table - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.description_many": {
    message: "Revisa i envia {count} moviments bancaris al teu llibre major",
    description:
      "Card description for the transaction review table - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.transactionReview.description_other": {
    message: "Revisa i envia {count} moviments bancaris al teu llibre major",
    description:
      "Card description for the transaction review table - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.submitting": {
    message: "S'està enviant...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "Envia",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "Cerca per comerç o descripció...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "Filtra per banc",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "Tots els bancs",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "Filtra per compte bancari",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "Tots els comptes bancaris",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected_one": {
    message: "{count} compte seleccionat",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_many": {
    message: "{count} comptes seleccionats",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_other": {
    message: "{count} comptes seleccionats",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "Cap transacció coincideix amb els filtres actuals.",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "Esborra els filtres",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message:
      "{count} transaccions seleccionades estan amagades pels filtres actuals, però igualment s'enviaran o s'eliminaran.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.hiddenSelectedNotice_one": {
    message:
      "{count} transacció seleccionada està amagada pels filtres actuals, però igualment s'enviarà o s'eliminarà.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.hiddenSelectedNotice_many": {
    message:
      "{count} transaccions seleccionades estan amagades pels filtres actuals, però igualment s'enviaran o s'eliminaran.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.transactionReview.hiddenSelectedNotice_other": {
    message:
      "{count} transaccions seleccionades estan amagades pels filtres actuals, però igualment s'enviaran o s'eliminaran.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.setForSelected": {
    message: "Defineix per als seleccionats",
    description:
      "Button in the Target account column header that gives every selected transaction the same target account",
  },
  "plaid.transactionReview.setForSelectedNoSelection": {
    message:
      "Seleccioneu primer transaccions per definir-ne el compte de destinació.",
    description:
      "Reason shown (tooltip and screen-reader text) while the Set for selected button is disabled because no transaction is selected",
  },
  "plaid.transactionReview.bulkTitle": {
    message:
      "Defineix el compte de destinació per a {count} transaccions seleccionades",
    description:
      "Heading of the Set for selected panel - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkTitle_one": {
    message:
      "Defineix el compte de destinació per a {count} transacció seleccionada",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkTitle_many": {
    message:
      "Defineix el compte de destinació per a {count} transaccions seleccionades",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkTitle_other": {
    message:
      "Defineix el compte de destinació per a {count} transaccions seleccionades",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote": {
    message:
      "{count} d'elles estan amagades pels filtres actuals i també es definiran.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkHiddenNote_one": {
    message:
      "{count} d'elles està amagada pels filtres actuals i també es definirà.",
    description:
      "Note in the Set for selected panel when a selected row falls outside the active filters - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkHiddenNote_many": {
    message:
      "{count} d'elles estan amagades pels filtres actuals i també es definiran.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote_other": {
    message:
      "{count} d'elles estan amagades pels filtres actuals i també es definiran.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting": {
    message: "Substitueix també {count} comptes de destinació ja definits",
    description:
      "Switch label in the Set for selected panel; off keeps targets already set (AI Fill or hand-picked) - interpolation: {count} is how many selected rows already have a target (base key for pluralization)",
  },
  "plaid.transactionReview.bulkReplaceExisting_one": {
    message: "Substitueix també {count} compte de destinació ja definit",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkReplaceExisting_many": {
    message: "Substitueix també {count} comptes de destinació ja definits",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting_other": {
    message: "Substitueix també {count} comptes de destinació ja definits",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet": {
    message: "{count} transaccions rebran aquest compte.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkWillSet_one": {
    message: "{count} transacció rebrà aquest compte.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkWillSet_many": {
    message: "{count} transaccions rebran aquest compte.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet_other": {
    message: "{count} transaccions rebran aquest compte.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkApply": {
    message: "Aplica",
    description:
      "Button in the Set for selected panel that gives the selected transactions the chosen target account",
  },
  "plaid.transactionReview.toast.targetAccountSet": {
    message: "Compte de destinació definit",
    description:
      "Toast title after the Set for selected panel has applied an account",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription": {
    message: "{count} transaccions ara van a {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_one": {
    message: "{count} transacció ara va a {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - singular form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_many": {
    message: "{count} transaccions ara van a {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_other": {
    message: "{count} transaccions ara van a {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "Trieu a quin fitxer voleu importar",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message:
      "{count} transaccions seleccionades necessiten comptes de destinació abans d'enviar-les.",
    description:
      "Alert message for missing target accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.missingAccountsAlert_one": {
    message:
      "{count} transacció seleccionada necessita un compte de destinació abans d'enviar-la.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.missingAccountsAlert_many": {
    message:
      "{count} transaccions seleccionades necessiten comptes de destinació abans d'enviar-les.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.transactionReview.missingAccountsAlert_other": {
    message:
      "{count} transaccions seleccionades necessiten comptes de destinació abans d'enviar-les.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.selectAll": {
    message: "Selecciona-ho tot",
    description: "Checkbox label to select all transactions",
  },
  "plaid.transactionReview.date": {
    message: "Data",
    description: "Table header for date column",
  },
  "plaid.transactionReview.source": {
    message: "Banc",
    description: "Table header for the source institution/account column",
  },
  "plaid.transactionReview.sourceAccount": {
    message: "Compte d'origen",
    description:
      "Table header for the editable Beancount source-account column, defaults from the account mapping",
  },
  "plaid.transactionReview.merchant": {
    message: "Comerç",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "Descripció",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "Import",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "Compte de destinació",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "IA...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "Emplena amb IA",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "Selecciona un compte...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "Categorització completada",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_one": {
    message: "La IA ha suggerit comptes per a {count} transacció.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_many": {
    message: "La IA ha suggerit comptes per a {count} transaccions.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_other": {
    message: "La IA ha suggerit comptes per a {count} transaccions.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "La categorització ha fallat",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message: "No s'han pogut categoritzar les transaccions. Torna-ho a provar.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "Cap transacció seleccionada",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "Selecciona almenys una transacció per enviar.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "Falten comptes de destinació",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message:
      "{count} transaccions seleccionades necessiten comptes de destinació.",
    description:
      "Toast description for missing accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_one": {
    message:
      "{count} transacció seleccionada necessita un compte de destinació.",
    description:
      "Toast description for missing accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_many": {
    message:
      "{count} transaccions seleccionades necessiten comptes de destinació.",
    description:
      "Toast description for missing accounts - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_other": {
    message:
      "{count} transaccions seleccionades necessiten comptes de destinació.",
    description:
      "Toast description for missing accounts - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "Transaccions enviades",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_one": {
    message: "S'ha afegit {count} transacció al teu llibre major.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_many": {
    message: "S'han afegit {count} transaccions al teu llibre major.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_other": {
    message: "S'han afegit {count} transaccions al teu llibre major.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "L'enviament ha fallat",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "No s'han pogut enviar les transaccions. Torna-ho a provar.",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "Suprimeix",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "S'està suprimint...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "Voleu suprimir les transaccions?",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message:
      "Això eliminarà permanentment {count} transaccions seleccionades d'aquesta llista. Aquesta acció no es pot desfer.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.deleteConfirmDescription_one": {
    message:
      "Això eliminarà permanentment {count} transacció seleccionada d'aquesta llista. Aquesta acció no es pot desfer.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.deleteConfirmDescription_many": {
    message:
      "Això eliminarà permanentment {count} transaccions seleccionades d'aquesta llista. Aquesta acció no es pot desfer.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.transactionReview.deleteConfirmDescription_other": {
    message:
      "Això eliminarà permanentment {count} transaccions seleccionades d'aquesta llista. Aquesta acció no es pot desfer.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "Transaccions suprimides",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "S'han eliminat {count} transaccions d'aquesta llista.",
    description:
      "Toast description for deleted transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_one": {
    message: "S'ha eliminat {count} transacció d'aquesta llista.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_many": {
    message: "S'han eliminat {count} transaccions d'aquesta llista.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - form for large round counts such as millions",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_other": {
    message: "S'han eliminat {count} transaccions d'aquesta llista.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "No s'han pogut suprimir",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "No s'han pogut suprimir les transaccions. Torneu-ho a provar.",
    description: "Toast description for deletion failure",
  },
  "plaid.institutionNotFound": {
    message: "No s'ha trobat la institució",
    description: "Empty state when a Plaid institution is unavailable",
  },
  "plaid.thisInstitution": {
    message: "aquesta institució",
    description: "Fallback name for a Plaid institution",
  },
  "plaid.transactionReview.selectTransaction": {
    message: "Selecciona la transacció {transaction}",
    description: "Accessible label for selecting a Plaid transaction",
  },
  "plaid.connection.cancelled": {
    message: "Connexió cancel·lada",
    description: "Toast title when Plaid connection is cancelled",
  },
  "plaid.connection.linkClosed": {
    message: "L'enllaç Plaid s'ha tancat.",
    description: "Toast description when Plaid Link closes",
  },
  "plaid.connection.alreadyExists": {
    message: "La connexió ja existeix",
    description: "Toast title for a duplicate Plaid connection",
  },
  "plaid.connection.alreadyExistsDescription": {
    message:
      "Ja teniu una connexió activa a {institution}. Desenllaçeu primer la connexió existent.",
    description: "Toast description for a duplicate Plaid connection",
  },
  "plaid.connection.failed": {
    message: "La connexió ha fallat",
    description: "Toast title when Plaid connection fails",
  },
  "plaid.connection.connecting": {
    message: "S'està connectant...",
    description: "Status while connecting a bank",
  },
  "plaid.connection.preparing": {
    message: "S'està preparant...",
    description: "Status while preparing Plaid Link",
  },
  "plaid.connection.waitingForAuthorization": {
    message: "S'està esperant l'autorització...",
    description: "Status while waiting for Plaid authorization",
  },
  "plaid.connection.finalizing": {
    message: "S'està acabant…",
    description: "Status while finalizing a Plaid connection",
  },
  "plaid.reauth.reconnected": {
    message: "Banc tornat a connectar",
    description: "Toast title after reconnecting a bank",
  },
  "plaid.reauth.reconnectedDescription": {
    message: "El vostre compte bancari s'ha tornat a connectar correctament.",
    description: "Toast description after reconnecting a bank",
  },
  "plaid.reauth.statusUpdateFailed": {
    message: "L'actualització d'estat ha fallat",
    description: "Toast title when a reconnected bank status cannot update",
  },
  "plaid.reauth.statusUpdateFailedDescription": {
    message:
      "La reconnexió ha estat correcta, però no s'ha pogut actualitzar l'estat. Si us plau, actualitzeu la pàgina.",
    description:
      "Toast description when status update fails after reconnection",
  },
  "plaid.reauth.cancelled": {
    message: "Reconnexió cancel·lada",
    description: "Toast title when bank reconnection is cancelled",
  },
  "plaid.reauth.linkClosed": {
    message: "Plaid Link s'ha tancat sense tornar a connectar-se.",
    description: "Toast description when Plaid Link closes during reconnection",
  },
  "plaid.reauth.failed": {
    message: "No s'ha pogut tornar a connectar",
    description: "Toast title when bank reconnection fails",
  },
  "plaid.reauth.reconnecting": {
    message: "S'està tornant a connectar...",
    description: "Status while reconnecting a bank",
  },
  "plaid.reauth.updatingStatus": {
    message: "S'està actualitzant l'estat...",
    description: "Status while updating a reconnected bank",
  },
};

export default caPlaid;
