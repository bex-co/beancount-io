export interface TranslationEntry {
  message: string;
  description: string;
}

const nlPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.pageTitle": {
    message: "Gekoppelde rekeningen",
    description:
      "Page heading for ledger bank connections and imported transactions",
  },
  "plaid.access.adminOnly": {
    message:
      "Alleen de eigenaar van het grootboek of een beheerder kan banken koppelen en beheren.",
    description:
      "Notice shown when the viewer cannot administer ledger bank connections",
  },
  "plaid.connectedSuccessfully": {
    message: "✓ Verbonden",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "Banksynchronisatie",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "Account verbinden",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message:
      "Importeer automatisch transacties met veilige versleuteling op bankniveau",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "Stroomlijn je boekhoudproces",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "Verbind je bankrekeningen via Plaid om automatisch transacties te importeren, uren handmatige invoer te besparen en je grootboek in realtime actueel te houden.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "Meer dan 11.000 instellingen",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "Beveiliging op bankniveau",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "Realtime synchronisatie",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "Aan de slag",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "Waarom je bank verbinden?",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "Automatisch importeren",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "Bespaar uren handmatige invoer door transacties van je bankrekeningen automatisch en in realtime te importeren. Richt je op analyse, niet op gegevensinvoer.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "Beveiliging op bankniveau",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid gebruikt 256-bits versleuteling en wordt vertrouwd door duizenden financiële instellingen. Je inloggegevens worden nooit op onze servers opgeslagen.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "Privacy voorop",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "We slaan je bankinloggegevens nooit op en verkopen je gegevens niet. Je financiële informatie wordt beschermd volgens toonaangevende privacynormen.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "Zo werkt het",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "Verbind je bankrekening in een paar eenvoudige stappen",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "Kies je bank",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message: "Zoek tussen meer dan 11.000 ondersteunde financiële instellingen",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "Veilige verificatie",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message: "Log veilig in via het verificatiesysteem van je bank",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "Begin met importeren",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message:
      "Je transacties worden automatisch met je grootboek gesynchroniseerd",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "Nog een bank verbinden",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "Bank verbinden",
    description:
      "Button text to connect a bank, shown on the connections page when no bank is connected yet",
  },
  "plaid.management.connectionsTitle": {
    message: "Bankverbindingen",
    description: "Section title for the list of connected banks",
  },
  "plaid.management.connectionsSubtitle": {
    message: "Beheer rekeningkoppelingen, synchroniseer en ontkoppel banken.",
    description: "Section subtitle for the list of connected banks",
  },
  "plaid.management.noConnectionsTitle": {
    message: "Geen banken verbonden",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message: "Verbind een bank om automatisch transacties te importeren.",
    description:
      "Empty state description on the connections page when no bank is connected",
  },
  "plaid.management.sync": {
    message: "Synchroniseren",
    description: "Button text to sync transactions across every connected bank",
  },
  "plaid.management.syncing": {
    message: "Synchroniseren...",
    description: "Button text while syncing every connected bank",
  },
  "plaid.management.manageBanks": {
    message: "Banken beheren",
    description:
      "Button text linking to the dedicated bank-connection management page",
  },
  "plaid.management.backToTransactions": {
    message: "Terug naar transacties",
    description:
      "Back button text on the manage-banks page, returning to the transaction review page",
  },
  "plaid.management.toast.error": {
    message: "Fout",
    description: "Generic error toast title",
  },
  "plaid.management.toast.syncAllComplete": {
    message: "Synchronisatie voltooid",
    description: "Toast title after syncing every connected bank",
  },
  "plaid.management.toast.syncAllCompleteDescription": {
    message: "{transactions} gesynchroniseerd vanuit {banks}.",
    description:
      "Toast description after syncing every connected bank - interpolation: {transactions} is plaid.management.toast.syncAllTransactionsPart, {banks} is plaid.management.toast.syncAllBanksPart; each fragment is pluralized on its own count",
  },
  "plaid.management.toast.syncAllTransactionsPart": {
    message: "{count} nieuwe transacties",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllTransactionsPart_one": {
    message: "{count} nieuwe transactie",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllTransactionsPart_other": {
    message: "{count} nieuwe transacties",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllBanksPart": {
    message: "{count} banken",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllBanksPart_one": {
    message: "{count} bank",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllBanksPart_other": {
    message: "{count} banken",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllSkipped": {
    message: "{count} banken moeten opnieuw worden verbonden",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllSkipped_one": {
    message: "{count} bank moet opnieuw worden verbonden",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllSkipped_other": {
    message: "{count} banken moeten opnieuw worden verbonden",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllFailedDescription": {
    message: "Synchroniseren van transacties mislukt. Probeer het opnieuw.",
    description: "Toast description when Sync All fails",
  },

  // Bank Account List
  "plaid.bankAccount.linkedOn": {
    message: "Gekoppeld op {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "Actief",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "Opnieuw verifiëren vereist",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "Uitgeschakeld",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "Laatst gesynchroniseerd",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount": {
    message: "{count} transacties",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "Mislukt",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "Opnieuw verbinden...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "Bank opnieuw verbinden",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "Ontkoppelen...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "Ontkoppelen",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "Bankrekening ontkoppelen",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "Weet je zeker dat je {institutionName} wilt ontkoppelen? Hiermee worden alle verbonden rekeningen verwijderd en stopt de automatische synchronisatie van transacties.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "Annuleren",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "Bank ontkoppeld",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "{institutionName} is ontkoppeld.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "Fout",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "Ontkoppelen van bankrekening mislukt.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message: "Selecteer een bankrekening om rekeningkoppelingen in te stellen",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "Geen rekeningen gevonden voor deze bank",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "Rekeningen beheren",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "Rekeningen toevoegen of verwijderen die deze bank deelt",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "Verbind deze bank eerst opnieuw",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "Rekeningen toevoegen",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "Rekeningen bijwerken...",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "Voorbereiden...",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "Wachten op je bank...",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "Wijzigingen toepassen...",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "Rekeningen bijgewerkt",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "{added} toegevoegd, {removed} verwijderd.",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "Geen wijzigingen in rekeningen",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "Er is niets gewijzigd. Sommige banken laten je alleen in hun eigen app of website aanpassen welke rekeningen worden gedeeld.",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "Kan rekeningen niet bijwerken",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message:
      "Je bank heeft de wijziging mogelijk opgeslagen. Open Rekeningen beheren opnieuw om het nog eens te proberen.",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "Rekeningwijzigingen geannuleerd",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "Plaid Link is gesloten zonder rekeningen te wijzigen.",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "Rekeningen",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.currency": {
    message: "Valuta",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Beancount-rekening",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "Opslaan...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "Opslaan",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "Annuleren",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "Niet gekoppeld",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "Bewerken",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "Koppeling instellen",
    description: "Button text to set mapping for unmapped account",
  },
  "plaid.accountMapping.aiSuggested": {
    message: "Voorgesteld door AI",
    description: "Badge/hint shown next to an AI-prefilled account mapping",
  },
  "plaid.accountMapping.suggestedAccount": {
    message: "AI stelt voor: {account}",
    description:
      "Inline hint showing the AI-suggested account for an unmapped account - interpolation: {account}",
  },
  "plaid.accountMapping.suggesting": {
    message: "AI-suggesties ophalen...",
    description: "Loading label while AI mapping suggestions are fetched",
  },
  "plaid.accountMapping.acceptAllSuggestions": {
    message: "Alle suggesties accepteren ({count})",
    description:
      "Button text to accept every AI-suggested mapping at once - interpolation: {count}",
  },
  "plaid.accountMapping.accepting": {
    message: "Accepteren...",
    description: "Button text while accepting all suggestions",
  },

  // Account Mapping - Toast Messages
  "plaid.accountMapping.toast.invalidAccount": {
    message: "Ongeldige rekening",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "Voer een geldige Beancount-rekeningnaam in.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "Koppeling opgeslagen",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} gekoppeld aan {ledgerAccount} ({currency})",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "Fout",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "Opslaan van rekeningkoppeling mislukt.",
    description: "Toast description for save error",
  },
  "plaid.accountMapping.toast.acceptedAll": {
    message: "Suggesties geaccepteerd",
    description: "Toast title after accepting all AI mapping suggestions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription": {
    message: "{count} rekeningen gekoppeld met AI-suggesties.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_one": {
    message: "{count} rekening gekoppeld met AI-suggesties.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - singular form",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_other": {
    message: "{count} rekeningen gekoppeld met AI-suggesties.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - plural form",
  },

  // Account Detail Page

  // Transaction Review Table
  "plaid.transactionReview.noPendingTitle": {
    message: "Geen banktransacties",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message:
      "Alle transacties zijn met je grootboek gesynchroniseerd of er zijn geen nieuwe transacties.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "Banktransacties",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message: "Controleer {count} transacties en dien ze in bij je grootboek",
    description:
      "Card description for the transaction review table - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.description_one": {
    message: "Controleer {count} transactie en dien deze in bij je grootboek",
    description:
      "Card description for the transaction review table - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.description_other": {
    message: "Controleer {count} transacties en dien ze in bij je grootboek",
    description:
      "Card description for the transaction review table - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.submitting": {
    message: "Indienen...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "Indienen",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "Zoeken op handelaar of omschrijving...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "Filteren op bank",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "Alle banken",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "Filteren op bankrekening",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "Alle bankrekeningen",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected": {
    message: "{count} rekeningen geselecteerd",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "Geen transacties komen overeen met de huidige filters.",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "Filters wissen",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message:
      "{count} geselecteerde transacties zijn verborgen door de huidige filters, maar worden toch ingediend of verwijderd.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.hiddenSelectedNotice_one": {
    message:
      "{count} geselecteerde transactie is verborgen door de huidige filters, maar wordt toch ingediend of verwijderd.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.hiddenSelectedNotice_other": {
    message:
      "{count} geselecteerde transacties zijn verborgen door de huidige filters, maar worden toch ingediend of verwijderd.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.setForSelected": {
    message: "Instellen voor selectie",
    description:
      "Button in the Target account column header that gives every selected transaction the same target account",
  },
  "plaid.transactionReview.setForSelectedNoSelection": {
    message: "Selecteer eerst transacties om hun doelrekening in te stellen.",
    description:
      "Reason shown (tooltip and screen-reader text) while the Set for selected button is disabled because no transaction is selected",
  },
  "plaid.transactionReview.bulkTitle": {
    message: "Doelrekening instellen voor {count} geselecteerde transacties",
    description:
      "Heading of the Set for selected panel - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkTitle_one": {
    message: "Doelrekening instellen voor {count} geselecteerde transactie",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkTitle_other": {
    message: "Doelrekening instellen voor {count} geselecteerde transacties",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote": {
    message:
      "{count} daarvan zijn verborgen door de huidige filters en worden ook ingesteld.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkHiddenNote_one": {
    message:
      "{count} daarvan is verborgen door de huidige filters en wordt ook ingesteld.",
    description:
      "Note in the Set for selected panel when a selected row falls outside the active filters - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkHiddenNote_other": {
    message:
      "{count} daarvan zijn verborgen door de huidige filters en worden ook ingesteld.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting": {
    message: "Ook {count} reeds ingestelde doelrekeningen vervangen",
    description:
      "Switch label in the Set for selected panel; off keeps targets already set (AI Fill or hand-picked) - interpolation: {count} is how many selected rows already have a target (base key for pluralization)",
  },
  "plaid.transactionReview.bulkReplaceExisting_one": {
    message: "Ook {count} reeds ingestelde doelrekening vervangen",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkReplaceExisting_other": {
    message: "Ook {count} reeds ingestelde doelrekeningen vervangen",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet": {
    message: "{count} transacties krijgen deze rekening.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkWillSet_one": {
    message: "{count} transactie krijgt deze rekening.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkWillSet_other": {
    message: "{count} transacties krijgen deze rekening.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkApply": {
    message: "Toepassen",
    description:
      "Button in the Set for selected panel that gives the selected transactions the chosen target account",
  },
  "plaid.transactionReview.toast.targetAccountSet": {
    message: "Doelrekening ingesteld",
    description:
      "Toast title after the Set for selected panel has applied an account",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription": {
    message: "{count} transacties gaan nu naar {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_one": {
    message: "{count} transactie gaat nu naar {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - singular form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_other": {
    message: "{count} transacties gaan nu naar {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "Kies in welk bestand je wilt importeren",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message:
      "{count} geselecteerde transacties hebben een doelrekening nodig voordat ze kunnen worden ingediend.",
    description:
      "Alert message for missing target accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.missingAccountsAlert_one": {
    message:
      "{count} geselecteerde transactie heeft een doelrekening nodig voordat deze kan worden ingediend.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.missingAccountsAlert_other": {
    message:
      "{count} geselecteerde transacties hebben een doelrekening nodig voordat ze kunnen worden ingediend.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.selectAll": {
    message: "Alles selecteren",
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
    message: "Bronrekening",
    description:
      "Table header for the editable Beancount source-account column, defaults from the account mapping",
  },
  "plaid.transactionReview.merchant": {
    message: "Handelaar",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "Omschrijving",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "Bedrag",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "Doelrekening",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "AI bezig...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "AI-invulling",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "Rekening selecteren...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "Categorisering voltooid",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription": {
    message: "AI heeft rekeningen voorgesteld voor {count} transacties.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "Categorisering mislukt",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message: "Categoriseren van transacties mislukt. Probeer het opnieuw.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "Geen transacties geselecteerd",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "Selecteer ten minste één transactie om in te dienen.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "Doelrekeningen ontbreken",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message: "{count} geselecteerde transacties hebben een doelrekening nodig.",
    description:
      "Toast description for missing accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_one": {
    message: "{count} geselecteerde transactie heeft een doelrekening nodig.",
    description:
      "Toast description for missing accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_other": {
    message: "{count} geselecteerde transacties hebben een doelrekening nodig.",
    description:
      "Toast description for missing accounts - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "Transacties ingediend",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription": {
    message: "{count} transacties toegevoegd aan je grootboek.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "Indienen mislukt",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "Indienen van transacties mislukt. Probeer het opnieuw.",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "Verwijderen",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "Verwijderen...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "Transacties verwijderen?",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message:
      "Hiermee worden {count} geselecteerde transacties definitief uit deze lijst verwijderd. Dit kan niet ongedaan worden gemaakt.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.deleteConfirmDescription_one": {
    message:
      "Hiermee wordt {count} geselecteerde transactie definitief uit deze lijst verwijderd. Dit kan niet ongedaan worden gemaakt.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.deleteConfirmDescription_other": {
    message:
      "Hiermee worden {count} geselecteerde transacties definitief uit deze lijst verwijderd. Dit kan niet ongedaan worden gemaakt.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "Transacties verwijderd",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "{count} transacties uit deze lijst verwijderd.",
    description:
      "Toast description for deleted transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_one": {
    message: "{count} transactie uit deze lijst verwijderd.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_other": {
    message: "{count} transacties uit deze lijst verwijderd.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "Verwijderen mislukt",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message:
      "De transacties konden niet worden verwijderd. Probeer het opnieuw.",
    description: "Toast description for deletion failure",
  },
  "plaid.institutionNotFound": {
    message: "Instelling niet gevonden",
    description: "Empty state when a Plaid institution is unavailable",
  },
  "plaid.thisInstitution": {
    message: "deze instelling",
    description: "Fallback name for a Plaid institution",
  },
  "plaid.transactionReview.selectTransaction": {
    message: "Selecteer transactie {transaction}",
    description: "Accessible label for selecting a Plaid transaction",
  },
  "plaid.connection.cancelled": {
    message: "Verbinding geannuleerd",
    description: "Toast title when Plaid connection is cancelled",
  },
  "plaid.connection.linkClosed": {
    message: "Plaid-link is gesloten.",
    description: "Toast description when Plaid Link closes",
  },
  "plaid.connection.alreadyExists": {
    message: "Verbinding bestaat al",
    description: "Toast title for a duplicate Plaid connection",
  },
  "plaid.connection.alreadyExistsDescription": {
    message:
      "Je hebt al een actieve verbinding met {institution}. Ontkoppel eerst de bestaande verbinding.",
    description: "Toast description for a duplicate Plaid connection",
  },
  "plaid.connection.failed": {
    message: "Verbinding mislukt",
    description: "Toast title when Plaid connection fails",
  },
  "plaid.connection.connecting": {
    message: "Verbinden…",
    description: "Status while connecting a bank",
  },
  "plaid.connection.preparing": {
    message: "Voorbereiden…",
    description: "Status while preparing Plaid Link",
  },
  "plaid.connection.waitingForAuthorization": {
    message: "Wachten op autorisatie…",
    description: "Status while waiting for Plaid authorization",
  },
  "plaid.connection.finalizing": {
    message: "Bezig met afronden…",
    description: "Status while finalizing a Plaid connection",
  },
  "plaid.reauth.reconnected": {
    message: "Bank opnieuw verbonden",
    description: "Toast title after reconnecting a bank",
  },
  "plaid.reauth.reconnectedDescription": {
    message: "Uw bankrekening is opnieuw gekoppeld.",
    description: "Toast description after reconnecting a bank",
  },
  "plaid.reauth.statusUpdateFailed": {
    message: "Statusupdate mislukt",
    description: "Toast title when a reconnected bank status cannot update",
  },
  "plaid.reauth.statusUpdateFailedDescription": {
    message:
      "Opnieuw verbinding maken is gelukt, maar de status kan niet worden bijgewerkt. Vernieuw de pagina.",
    description:
      "Toast description when status update fails after reconnection",
  },
  "plaid.reauth.cancelled": {
    message: "Opnieuw verbinden geannuleerd",
    description: "Toast title when bank reconnection is cancelled",
  },
  "plaid.reauth.linkClosed": {
    message: "Plaid Link is gesloten zonder opnieuw verbinding te maken.",
    description: "Toast description when Plaid Link closes during reconnection",
  },
  "plaid.reauth.failed": {
    message: "Opnieuw verbinden mislukt",
    description: "Toast title when bank reconnection fails",
  },
  "plaid.reauth.reconnecting": {
    message: "Opnieuw verbinden…",
    description: "Status while reconnecting a bank",
  },
  "plaid.reauth.updatingStatus": {
    message: "Status bijwerken…",
    description: "Status while updating a reconnected bank",
  },
};

export default nlPlaid;
