export interface TranslationEntry {
  message: string;
  description: string;
}

const skPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.pageTitle": {
    message: "Pripojené účty",
    description:
      "Page heading for ledger bank connections and imported transactions",
  },
  "plaid.access.adminOnly": {
    message:
      "Banky môže pripájať a spravovať iba vlastník účtovnej knihy alebo správca.",
    description:
      "Notice shown when the viewer cannot administer ledger bank connections",
  },
  "plaid.connectedSuccessfully": {
    message: "✓ Úspešne pripojené",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "Banková synchronizácia",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "Pripojiť účet",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message:
      "Automaticky importujte transakcie s bezpečným šifrovaním na úrovni bánk",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "Zjednodušte svoje účtovníctvo",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "Pripojte svoje bankové účty cez Plaid, automaticky importujte transakcie, ušetrite hodiny ručného zadávania údajov a majte účtovnú knihu vždy aktuálnu v reálnom čase.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "Viac ako 11 000 inštitúcií",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "Zabezpečenie na úrovni bánk",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "Synchronizácia v reálnom čase",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "Začať",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "Prečo pripojiť banku?",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "Automatický import",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "Ušetrite hodiny ručného zadávania vďaka automatickému importu transakcií z vašich bankových účtov v reálnom čase. Sústreďte sa na analýzu, nie na zadávanie údajov.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "Zabezpečenie na úrovni bánk",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid používa 256-bitové šifrovanie a dôverujú mu tisíce finančných inštitúcií. Vaše prihlasovacie údaje sa nikdy neukladajú na našich serveroch.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "Súkromie na prvom mieste",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "Nikdy neukladáme vaše bankové prihlasovacie údaje ani nepredávame vaše dáta. Vaše finančné informácie chránia špičkové štandardy ochrany súkromia.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "Ako to funguje",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "Pripojte svoj bankový účet v niekoľkých jednoduchých krokoch",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "Vyberte svoju banku",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message:
      "Vyhľadávajte medzi viac ako 11 000 podporovanými finančnými inštitúciami",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "Bezpečné overenie",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message: "Bezpečne sa prihláste cez overovací systém svojej banky",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "Začnite importovať",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message:
      "Vaše transakcie sa budú automaticky synchronizovať s vašou účtovnou knihou",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "Pripojiť ďalšiu banku",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "Pripojiť banku",
    description:
      "Button text to connect a bank, shown on the connections page when no bank is connected yet",
  },
  "plaid.management.connectionsTitle": {
    message: "Bankové pripojenia",
    description: "Section title for the list of connected banks",
  },
  "plaid.management.connectionsSubtitle": {
    message: "Spravujte priradenia účtov, synchronizáciu a odpájanie bánk.",
    description: "Section subtitle for the list of connected banks",
  },
  "plaid.management.noConnectionsTitle": {
    message: "Žiadne pripojené banky",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message: "Pripojte banku a automaticky importujte transakcie.",
    description:
      "Empty state description on the connections page when no bank is connected",
  },
  "plaid.management.sync": {
    message: "Synchronizovať",
    description: "Button text to sync transactions across every connected bank",
  },
  "plaid.management.syncing": {
    message: "Synchronizuje sa...",
    description: "Button text while syncing every connected bank",
  },
  "plaid.management.manageBanks": {
    message: "Spravovať banky",
    description:
      "Button text linking to the dedicated bank-connection management page",
  },
  "plaid.management.backToTransactions": {
    message: "Späť na transakcie",
    description:
      "Back button text on the manage-banks page, returning to the transaction review page",
  },
  "plaid.management.toast.error": {
    message: "Chyba",
    description: "Generic error toast title",
  },
  "plaid.management.toast.syncAllComplete": {
    message: "Synchronizácia dokončená",
    description: "Toast title after syncing every connected bank",
  },
  "plaid.management.toast.syncAllCompleteDescription": {
    message: "Z {banks} {transactions}.",
    description:
      "Toast description after syncing every connected bank - interpolation: {transactions} is plaid.management.toast.syncAllTransactionsPart, {banks} is plaid.management.toast.syncAllBanksPart; each fragment is pluralized on its own count",
  },
  "plaid.management.toast.syncAllTransactionsPart": {
    message: "sa synchronizovalo {count} nových transakcií",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllTransactionsPart_one": {
    message: "sa synchronizovala {count} nová transakcia",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllTransactionsPart_few": {
    message: "sa synchronizovali {count} nové transakcie",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.management.toast.syncAllTransactionsPart_many": {
    message: "sa synchronizovalo {count} novej transakcie",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - form for fractional counts",
  },
  "plaid.management.toast.syncAllTransactionsPart_other": {
    message: "sa synchronizovalo {count} nových transakcií",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - form for counts like 0 and 5 or more",
  },
  "plaid.management.toast.syncAllBanksPart": {
    message: "{count} bánk",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllBanksPart_one": {
    message: "{count} banky",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllBanksPart_few": {
    message: "{count} bánk",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.management.toast.syncAllBanksPart_many": {
    message: "{count} banky",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - form for fractional counts",
  },
  "plaid.management.toast.syncAllBanksPart_other": {
    message: "{count} bánk",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - form for counts like 0 and 5 or more",
  },
  "plaid.management.toast.syncAllSkipped": {
    message: "{count} bánk treba znova pripojiť",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllSkipped_one": {
    message: "{count} banku treba znova pripojiť",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllSkipped_few": {
    message: "{count} banky treba znova pripojiť",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.management.toast.syncAllSkipped_many": {
    message: "{count} banky treba znova pripojiť",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - form for fractional counts",
  },
  "plaid.management.toast.syncAllSkipped_other": {
    message: "{count} bánk treba znova pripojiť",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - form for counts like 0 and 5 or more",
  },
  "plaid.management.toast.syncAllFailedDescription": {
    message: "Transakcie sa nepodarilo synchronizovať. Skúste to znova.",
    description: "Toast description when Sync All fails",
  },

  // Bank Account List
  "plaid.bankAccount.linkedOn": {
    message: "Prepojené {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "Aktívny",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "Vyžaduje sa opätovné overenie",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "Vypnutý",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "Posledná synchronizácia",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount_one": {
    message: "{count} transakcia",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_few": {
    message: "{count} transakcie",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_many": {
    message: "{count} transakcie",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_other": {
    message: "{count} transakcií",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "Zlyhalo",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "Opätovné pripájanie...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "Znova pripojiť banku",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "Odpája sa...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "Odpojiť",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "Odpojiť bankový účet",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "Naozaj chcete odpojiť {institutionName}? Odstránia sa všetky pripojené účty a zastaví sa automatická synchronizácia transakcií.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "Zrušiť",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "Banka odpojená",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "{institutionName} bola odpojená.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "Chyba",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "Bankový účet sa nepodarilo odpojiť.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message: "Vyberte bankový účet na nastavenie priradení účtov",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "Pre túto banku sa nenašli žiadne účty",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "Spravovať účty",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "Pridajte alebo odstráňte účty zdieľané touto bankou",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "Najprv znova pripojte túto banku",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "Pridať účty",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "Aktualizujú sa účty...",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "Pripravuje sa...",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "Čaká sa na vašu banku...",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "Aplikujú sa zmeny...",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "Účty aktualizované",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "Pridané: {added}, odstránené: {removed}.",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "Žiadne zmeny účtov",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "Nič sa nezmenilo. Niektoré banky umožňujú zmeniť zdieľané účty iba vo vlastnej aplikácii alebo na webe.",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "Účty sa nepodarilo aktualizovať",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message:
      "Vaša banka mohla zmenu uložiť. Znova otvorte Spravovať účty a skúste to ešte raz.",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "Zmeny účtov zrušené",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "Plaid Link sa zavrel bez zmeny účtov.",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "Účty",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.currency": {
    message: "Mena",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Účet Beancount",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "Ukladá sa...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "Uložiť",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "Zrušiť",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "Nepriradené",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "Upraviť",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "Nastaviť priradenie",
    description: "Button text to set mapping for unmapped account",
  },
  "plaid.accountMapping.aiSuggested": {
    message: "Navrhnuté AI",
    description: "Badge/hint shown next to an AI-prefilled account mapping",
  },
  "plaid.accountMapping.suggestedAccount": {
    message: "AI navrhuje: {account}",
    description:
      "Inline hint showing the AI-suggested account for an unmapped account - interpolation: {account}",
  },
  "plaid.accountMapping.suggesting": {
    message: "Získavajú sa návrhy AI...",
    description: "Loading label while AI mapping suggestions are fetched",
  },
  "plaid.accountMapping.acceptAllSuggestions": {
    message: "Prijať všetky návrhy ({count})",
    description:
      "Button text to accept every AI-suggested mapping at once - interpolation: {count}",
  },
  "plaid.accountMapping.accepting": {
    message: "Prijíma sa...",
    description: "Button text while accepting all suggestions",
  },

  // Account Mapping - Toast Messages
  "plaid.accountMapping.toast.invalidAccount": {
    message: "Neplatný účet",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "Zadajte platný názov účtu Beancount.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "Priradenie uložené",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} priradený k {ledgerAccount} ({currency})",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "Chyba",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "Priradenie účtu sa nepodarilo uložiť.",
    description: "Toast description for save error",
  },
  "plaid.accountMapping.toast.acceptedAll": {
    message: "Návrhy prijaté",
    description: "Toast title after accepting all AI mapping suggestions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription": {
    message: "Podľa návrhov AI bolo priradených {count} účtov.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_one": {
    message: "Podľa návrhov AI bol priradený {count} účet.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - singular form",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_few": {
    message: "Podľa návrhov AI boli priradené {count} účty.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_many": {
    message: "Podľa návrhov AI bolo priradeného {count} účtu.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - form for fractional counts",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_other": {
    message: "Podľa návrhov AI bolo priradených {count} účtov.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - form for counts like 0 and 5 or more",
  },

  // Account Detail Page

  // Transaction Review Table
  "plaid.transactionReview.noPendingTitle": {
    message: "Žiadne bankové transakcie",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message:
      "Všetky transakcie sú synchronizované s vašou účtovnou knihou alebo nie sú žiadne nové transakcie.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "Bankové transakcie",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message: "Skontrolujte a odošlite do účtovnej knihy {count} transakcií",
    description:
      "Card description for the transaction review table - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.description_one": {
    message: "Skontrolujte a odošlite do účtovnej knihy {count} transakciu",
    description:
      "Card description for the transaction review table - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.description_few": {
    message: "Skontrolujte a odošlite do účtovnej knihy {count} transakcie",
    description:
      "Card description for the transaction review table - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.description_many": {
    message: "Skontrolujte a odošlite do účtovnej knihy {count} transakcie",
    description:
      "Card description for the transaction review table - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.description_other": {
    message: "Skontrolujte a odošlite do účtovnej knihy {count} transakcií",
    description:
      "Card description for the transaction review table - interpolation: {count} - form for counts like 0 and 5 or more",
  },
  "plaid.transactionReview.submitting": {
    message: "Odosiela sa...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "Odoslať",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "Hľadať podľa obchodníka alebo popisu...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "Filtrovať podľa banky",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "Všetky banky",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "Filtrovať podľa bankového účtu",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "Všetky bankové účty",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected_one": {
    message: "Vybraný {count} účet",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_few": {
    message: "Vybrané {count} účty",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_many": {
    message: "Vybraných {count} účtu",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_other": {
    message: "Vybraných {count} účtov",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "Žiadne transakcie nezodpovedajú aktuálnym filtrom.",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "Vymazať filtre",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message:
      "{count} vybraných transakcií je skrytých aktuálnymi filtrami, ale aj tak budú odoslané alebo odstránené.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.hiddenSelectedNotice_one": {
    message:
      "{count} vybraná transakcia je skrytá aktuálnymi filtrami, ale aj tak bude odoslaná alebo odstránená.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.hiddenSelectedNotice_few": {
    message:
      "{count} vybrané transakcie sú skryté aktuálnymi filtrami, ale aj tak budú odoslané alebo odstránené.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.hiddenSelectedNotice_many": {
    message:
      "{count} vybranej transakcie je skrytých aktuálnymi filtrami, ale aj tak budú odoslané alebo odstránené.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.hiddenSelectedNotice_other": {
    message:
      "{count} vybraných transakcií je skrytých aktuálnymi filtrami, ale aj tak budú odoslané alebo odstránené.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - form for counts like 0 and 5 or more",
  },
  "plaid.transactionReview.setForSelected": {
    message: "Nastaviť pre vybrané",
    description:
      "Button in the Target account column header that gives every selected transaction the same target account",
  },
  "plaid.transactionReview.setForSelectedNoSelection": {
    message:
      "Najprv vyberte transakcie, aby ste im mohli nastaviť cieľový účet.",
    description:
      "Reason shown (tooltip and screen-reader text) while the Set for selected button is disabled because no transaction is selected",
  },
  "plaid.transactionReview.bulkTitle": {
    message: "Nastaviť cieľový účet pre {count} vybraných transakcií",
    description:
      "Heading of the Set for selected panel - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkTitle_one": {
    message: "Nastaviť cieľový účet pre {count} vybranú transakciu",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkTitle_few": {
    message: "Nastaviť cieľový účet pre {count} vybrané transakcie",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkTitle_many": {
    message: "Nastaviť cieľový účet pre {count} vybranej transakcie",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkTitle_other": {
    message: "Nastaviť cieľový účet pre {count} vybraných transakcií",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote": {
    message:
      "{count} z nich je skrytých aktuálnymi filtrami a nastaví sa tiež.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkHiddenNote_one": {
    message: "{count} z nich je skrytá aktuálnymi filtrami a nastaví sa tiež.",
    description:
      "Note in the Set for selected panel when a selected row falls outside the active filters - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkHiddenNote_few": {
    message: "{count} z nich sú skryté aktuálnymi filtrami a nastavia sa tiež.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote_many": {
    message:
      "{count} z nich je skrytých aktuálnymi filtrami a nastaví sa tiež.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote_other": {
    message:
      "{count} z nich je skrytých aktuálnymi filtrami a nastaví sa tiež.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting": {
    message: "Nahradiť aj {count} už nastavených cieľových účtov",
    description:
      "Switch label in the Set for selected panel; off keeps targets already set (AI Fill or hand-picked) - interpolation: {count} is how many selected rows already have a target (base key for pluralization)",
  },
  "plaid.transactionReview.bulkReplaceExisting_one": {
    message: "Nahradiť aj {count} už nastavený cieľový účet",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkReplaceExisting_few": {
    message: "Nahradiť aj {count} už nastavené cieľové účty",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting_many": {
    message: "Nahradiť aj {count} už nastaveného cieľového účtu",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting_other": {
    message: "Nahradiť aj {count} už nastavených cieľových účtov",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet": {
    message: "{count} transakcií dostane tento účet.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkWillSet_one": {
    message: "{count} transakcia dostane tento účet.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkWillSet_few": {
    message: "{count} transakcie dostanú tento účet.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet_many": {
    message: "{count} transakcie dostane tento účet.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet_other": {
    message: "{count} transakcií dostane tento účet.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkApply": {
    message: "Použiť",
    description:
      "Button in the Set for selected panel that gives the selected transactions the chosen target account",
  },
  "plaid.transactionReview.toast.targetAccountSet": {
    message: "Cieľový účet nastavený",
    description:
      "Toast title after the Set for selected panel has applied an account",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription": {
    message: "{count} transakcií teraz patrí na účet {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_one": {
    message: "{count} transakcia teraz patrí na účet {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - singular form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_few": {
    message: "{count} transakcie teraz patria na účet {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_many": {
    message: "{count} transakcie teraz patrí na účet {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_other": {
    message: "{count} transakcií teraz patrí na účet {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "Vyberte, do ktorého súboru importovať",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message:
      "{count} vybraných transakcií potrebuje pred odoslaním cieľové účty.",
    description:
      "Alert message for missing target accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.missingAccountsAlert_one": {
    message:
      "{count} vybraná transakcia potrebuje pred odoslaním cieľový účet.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.missingAccountsAlert_few": {
    message:
      "{count} vybrané transakcie potrebujú pred odoslaním cieľové účty.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.missingAccountsAlert_many": {
    message:
      "{count} vybranej transakcie potrebuje pred odoslaním cieľové účty.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.missingAccountsAlert_other": {
    message:
      "{count} vybraných transakcií potrebuje pred odoslaním cieľové účty.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - form for counts like 0 and 5 or more",
  },
  "plaid.transactionReview.selectAll": {
    message: "Vybrať všetko",
    description: "Checkbox label to select all transactions",
  },
  "plaid.transactionReview.date": {
    message: "Dátum",
    description: "Table header for date column",
  },
  "plaid.transactionReview.source": {
    message: "Banka",
    description: "Table header for the source institution/account column",
  },
  "plaid.transactionReview.sourceAccount": {
    message: "Zdrojový účet",
    description:
      "Table header for the editable Beancount source-account column, defaults from the account mapping",
  },
  "plaid.transactionReview.merchant": {
    message: "Obchodník",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "Popis",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "Suma",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "Cieľový účet",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "AI pracuje...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "Vyplniť pomocou AI",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "Vyberte účet...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "Kategorizácia dokončená",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_one": {
    message: "AI navrhla účty pre {count} transakciu.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_few": {
    message: "AI navrhla účty pre {count} transakcie.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_many": {
    message: "AI navrhla účty pre {count} transakcie.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_other": {
    message: "AI navrhla účty pre {count} transakcií.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "Kategorizácia zlyhala",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message: "Transakcie sa nepodarilo kategorizovať. Skúste to znova.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "Nie sú vybrané žiadne transakcie",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "Vyberte aspoň jednu transakciu na odoslanie.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "Chýbajú cieľové účty",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message: "{count} vybraných transakcií potrebuje cieľové účty.",
    description:
      "Toast description for missing accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_one": {
    message: "{count} vybraná transakcia potrebuje cieľový účet.",
    description:
      "Toast description for missing accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_few": {
    message: "{count} vybrané transakcie potrebujú cieľové účty.",
    description:
      "Toast description for missing accounts - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_many": {
    message: "{count} vybranej transakcie potrebuje cieľové účty.",
    description:
      "Toast description for missing accounts - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_other": {
    message: "{count} vybraných transakcií potrebuje cieľové účty.",
    description:
      "Toast description for missing accounts - interpolation: {count} - form for counts like 0 and 5 or more",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "Transakcie odoslané",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_one": {
    message: "{count} transakcia bola pridaná do účtovnej knihy.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_few": {
    message: "{count} transakcie boli pridané do účtovnej knihy.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_many": {
    message: "Do účtovnej knihy pribudlo {count} transakcie.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_other": {
    message: "{count} transakcií bolo pridaných do účtovnej knihy.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "Odoslanie zlyhalo",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "Transakcie sa nepodarilo odoslať. Skúste to znova.",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "Odstrániť",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "Odstraňuje sa...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "Odstrániť transakcie?",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message:
      "Týmto sa {count} vybratých transakcií natrvalo odstráni z tohto zoznamu. Túto akciu nemožno vrátiť späť.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.deleteConfirmDescription_one": {
    message:
      "Týmto sa {count} vybratá transakcia natrvalo odstráni z tohto zoznamu. Túto akciu nemožno vrátiť späť.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.deleteConfirmDescription_few": {
    message:
      "Týmto sa {count} vybraté transakcie natrvalo odstránia z tohto zoznamu. Túto akciu nemožno vrátiť späť.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.deleteConfirmDescription_many": {
    message:
      "Týmto sa {count} vybratej transakcie natrvalo odstráni z tohto zoznamu. Túto akciu nemožno vrátiť späť.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.deleteConfirmDescription_other": {
    message:
      "Týmto sa {count} vybratých transakcií natrvalo odstráni z tohto zoznamu. Túto akciu nemožno vrátiť späť.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - form for counts like 0 and 5 or more",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "Transakcie odstránené",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "Z tohto zoznamu bolo odstránených {count} transakcií.",
    description:
      "Toast description for deleted transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_one": {
    message: "Z tohto zoznamu bola odstránená {count} transakcia.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_few": {
    message: "Z tohto zoznamu boli odstránené {count} transakcie.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_many": {
    message: "Z tohto zoznamu bolo odstránenej {count} transakcie.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_other": {
    message: "Z tohto zoznamu bolo odstránených {count} transakcií.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - form for counts like 0 and 5 or more",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "Odstránenie zlyhalo",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "Transakcie sa nepodarilo odstrániť. Skúste to znova.",
    description: "Toast description for deletion failure",
  },
  "plaid.institutionNotFound": {
    message: "Inštitúcia sa nenašla",
    description: "Empty state when a Plaid institution is unavailable",
  },
  "plaid.thisInstitution": {
    message: "tejto inštitúcie",
    description: "Fallback name for a Plaid institution",
  },
  "plaid.transactionReview.selectTransaction": {
    message: "Vybrať transakciu {transaction}",
    description: "Accessible label for selecting a Plaid transaction",
  },
  "plaid.connection.cancelled": {
    message: "Pripojenie zrušené",
    description: "Toast title when Plaid connection is cancelled",
  },
  "plaid.connection.linkClosed": {
    message: "Plaid Link bol uzavretý.",
    description: "Toast description when Plaid Link closes",
  },
  "plaid.connection.alreadyExists": {
    message: "Pripojenie už existuje",
    description: "Toast title for a duplicate Plaid connection",
  },
  "plaid.connection.alreadyExistsDescription": {
    message:
      "Už máte aktívne pripojenie k {institution}. Najprv zrušte prepojenie existujúceho pripojenia.",
    description: "Toast description for a duplicate Plaid connection",
  },
  "plaid.connection.failed": {
    message: "Pripojenie zlyhalo",
    description: "Toast title when Plaid connection fails",
  },
  "plaid.connection.connecting": {
    message: "Pripája sa…",
    description: "Status while connecting a bank",
  },
  "plaid.connection.preparing": {
    message: "Pripravuje sa…",
    description: "Status while preparing Plaid Link",
  },
  "plaid.connection.waitingForAuthorization": {
    message: "Čaká sa na autorizáciu…",
    description: "Status while waiting for Plaid authorization",
  },
  "plaid.connection.finalizing": {
    message: "Dokončuje sa…",
    description: "Status while finalizing a Plaid connection",
  },
  "plaid.reauth.reconnected": {
    message: "Banka znovu pripojená",
    description: "Toast title after reconnecting a bank",
  },
  "plaid.reauth.reconnectedDescription": {
    message: "Váš bankový účet bol úspešne prepojený.",
    description: "Toast description after reconnecting a bank",
  },
  "plaid.reauth.statusUpdateFailed": {
    message: "Aktualizácia stavu zlyhala",
    description: "Toast title when a reconnected bank status cannot update",
  },
  "plaid.reauth.statusUpdateFailedDescription": {
    message:
      "Opätovné pripojenie bolo úspešné, ale nepodarilo sa aktualizovať stav. Obnovte stránku.",
    description:
      "Toast description when status update fails after reconnection",
  },
  "plaid.reauth.cancelled": {
    message: "Opätovné pripojenie bolo zrušené",
    description: "Toast title when bank reconnection is cancelled",
  },
  "plaid.reauth.linkClosed": {
    message: "Plaid Link bol zatvorený bez opätovného pripojenia.",
    description: "Toast description when Plaid Link closes during reconnection",
  },
  "plaid.reauth.failed": {
    message: "Opätovné pripojenie zlyhalo",
    description: "Toast title when bank reconnection fails",
  },
  "plaid.reauth.reconnecting": {
    message: "Opätovné pripojenie…",
    description: "Status while reconnecting a bank",
  },
  "plaid.reauth.updatingStatus": {
    message: "Aktualizuje sa stav…",
    description: "Status while updating a reconnected bank",
  },
};

export default skPlaid;
