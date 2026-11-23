export interface TranslationEntry {
  message: string;
  description: string;
}

const bgPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.pageTitle": {
    message: "Свързани сметки",
    description:
      "Page heading for ledger bank connections and imported transactions",
  },
  "plaid.access.adminOnly": {
    message:
      "Само собственикът на счетоводната книга или администратор може да свързва и управлява банки.",
    description:
      "Notice shown when the viewer cannot administer ledger bank connections",
  },
  "plaid.connectedSuccessfully": {
    message: "✓ Свързването е успешно",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "Банкова синхронизация",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "Свържи акаунт",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message:
      "Импортирайте транзакции автоматично със защитено криптиране на банково ниво",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "Улеснете счетоводната си работа",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "Свържете банковите си сметки чрез Plaid, за да импортирате транзакции автоматично, да спестите часове ръчно въвеждане на данни и да поддържате главната си книга актуална в реално време.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "Над 11 000 институции",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "Сигурност на банково ниво",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "Синхронизация в реално време",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "Започнете",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "Защо да свържете банката си?",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "Автоматичен импорт",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "Спестете часове ръчно въвеждане, като импортирате транзакциите от банковите си сметки автоматично и в реално време. Съсредоточете се върху анализа, а не върху въвеждането на данни.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "Сигурност на банково ниво",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid използва 256-битово криптиране и му се доверяват хиляди финансови институции. Вашите идентификационни данни никога не се съхраняват на нашите сървъри.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "Поверителността на първо място",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "Никога не съхраняваме банковите ви идентификационни данни и не продаваме данните ви. Финансовата ви информация е защитена от водещи в индустрията стандарти за поверителност.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "Как работи",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "Свържете банковата си сметка само с няколко лесни стъпки",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "Изберете банката си",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message: "Търсете сред над 11 000 поддържани финансови институции",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "Сигурно удостоверяване",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message: "Влезте сигурно чрез системата за удостоверяване на вашата банка",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "Започнете импортирането",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message:
      "Вашите транзакции ще се синхронизират автоматично с главната ви книга",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "Свържи друга банка",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "Свържи банка",
    description:
      "Button text to connect a bank, shown on the connections page when no bank is connected yet",
  },
  "plaid.management.connectionsTitle": {
    message: "Банкови връзки",
    description: "Section title for the list of connected banks",
  },
  "plaid.management.connectionsSubtitle": {
    message:
      "Управлявайте съпоставянето на сметки, синхронизирането и прекъсването на връзката с банки.",
    description: "Section subtitle for the list of connected banks",
  },
  "plaid.management.noConnectionsTitle": {
    message: "Няма свързани банки",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message: "Свържете банка, за да импортирате транзакции автоматично.",
    description:
      "Empty state description on the connections page when no bank is connected",
  },
  "plaid.management.sync": {
    message: "Синхронизирай",
    description: "Button text to sync transactions across every connected bank",
  },
  "plaid.management.syncing": {
    message: "Синхронизиране...",
    description: "Button text while syncing every connected bank",
  },
  "plaid.management.manageBanks": {
    message: "Управление на банки",
    description:
      "Button text linking to the dedicated bank-connection management page",
  },
  "plaid.management.backToTransactions": {
    message: "Обратно към транзакциите",
    description:
      "Back button text on the manage-banks page, returning to the transaction review page",
  },
  "plaid.management.toast.error": {
    message: "Грешка",
    description: "Generic error toast title",
  },
  "plaid.management.toast.syncAllComplete": {
    message: "Синхронизацията завърши",
    description: "Toast title after syncing every connected bank",
  },
  "plaid.management.toast.syncAllCompleteDescription": {
    message: "{transactions} от {banks}.",
    description:
      "Toast description after syncing every connected bank - interpolation: {transactions} is plaid.management.toast.syncAllTransactionsPart, {banks} is plaid.management.toast.syncAllBanksPart; each fragment is pluralized on its own count",
  },
  "plaid.management.toast.syncAllTransactionsPart": {
    message: "Синхронизирани са {count} нови транзакции",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllTransactionsPart_one": {
    message: "Синхронизирана е {count} нова транзакция",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllTransactionsPart_other": {
    message: "Синхронизирани са {count} нови транзакции",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllBanksPart": {
    message: "{count} банки",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllBanksPart_one": {
    message: "{count} банка",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllBanksPart_other": {
    message: "{count} банки",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllSkipped": {
    message: "{count} банки трябва да бъдат свързани отново",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllSkipped_one": {
    message: "{count} банка трябва да бъде свързана отново",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllSkipped_other": {
    message: "{count} банки трябва да бъдат свързани отново",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllFailedDescription": {
    message: "Транзакциите не можаха да бъдат синхронизирани. Опитайте отново.",
    description: "Toast description when Sync All fails",
  },

  // Bank Account List
  "plaid.bankAccount.linkedOn": {
    message: "Свързана на {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "Активна",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "Изисква повторно удостоверяване",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "Деактивирана",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "Последна синхронизация",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount_one": {
    message: "{count} транзакция",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_other": {
    message: "{count} транзакции",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "Неуспешно",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "Повторно свързване...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "Свържи отново банката",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "Прекъсване на връзката...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "Прекъсни връзката",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "Прекъсване на връзката с банковата сметка",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "Сигурни ли сте, че искате да прекъснете връзката с {institutionName}? Това ще премахне всички свързани сметки и ще спре автоматичната синхронизация на транзакции.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "Отказ",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "Връзката с банката е прекъсната",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "Връзката с {institutionName} е прекъсната.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "Грешка",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "Връзката с банковата сметка не можа да бъде прекъсната.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message: "Изберете банкова сметка, за да настроите съпоставянето на сметки",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "Няма намерени сметки за тази банка",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "Управление на сметките",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "Добавете или премахнете сметки, споделяни от тази банка",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "Първо свържете отново тази банка",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "Добавяне на сметки",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "Обновяване на сметките...",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "Подготовка...",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "Изчакване на вашата банка...",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "Прилагане на промените...",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "Сметките са обновени",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "Добавени: {added}, премахнати: {removed}.",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "Няма промени по сметките",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "Нищо не се промени. Някои банки позволяват промяна на споделените сметки само в собственото си приложение или уебсайт.",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "Сметките не можаха да бъдат обновени",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message:
      "Банката ви може да е запазила промяната. Отворете отново „Управление на сметките“, за да опитате пак.",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "Промените по сметките са отменени",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "Plaid Link беше затворен без промяна на сметки.",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "Сметки",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.currency": {
    message: "Валута",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Сметка в Beancount",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "Запазване...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "Запази",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "Отказ",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "Не е съпоставена",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "Редактирай",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "Задай съпоставяне",
    description: "Button text to set mapping for unmapped account",
  },
  "plaid.accountMapping.aiSuggested": {
    message: "Предложено от AI",
    description: "Badge/hint shown next to an AI-prefilled account mapping",
  },
  "plaid.accountMapping.suggestedAccount": {
    message: "AI предлага: {account}",
    description:
      "Inline hint showing the AI-suggested account for an unmapped account - interpolation: {account}",
  },
  "plaid.accountMapping.suggesting": {
    message: "Получаване на предложения от AI...",
    description: "Loading label while AI mapping suggestions are fetched",
  },
  "plaid.accountMapping.acceptAllSuggestions": {
    message: "Приеми всички предложения ({count})",
    description:
      "Button text to accept every AI-suggested mapping at once - interpolation: {count}",
  },
  "plaid.accountMapping.accepting": {
    message: "Приемане...",
    description: "Button text while accepting all suggestions",
  },

  // Account Mapping - Toast Messages
  "plaid.accountMapping.toast.invalidAccount": {
    message: "Невалидна сметка",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "Въведете валидно име на сметка в Beancount.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "Съпоставянето е запазено",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} е съпоставена с {ledgerAccount} ({currency})",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "Грешка",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "Съпоставянето на сметката не можа да бъде запазено.",
    description: "Toast description for save error",
  },
  "plaid.accountMapping.toast.acceptedAll": {
    message: "Предложенията са приети",
    description: "Toast title after accepting all AI mapping suggestions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription": {
    message: "Съпоставени са {count} сметки въз основа на предложенията от AI.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_one": {
    message: "Съпоставена е {count} сметка въз основа на предложенията от AI.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - singular form",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_other": {
    message: "Съпоставени са {count} сметки въз основа на предложенията от AI.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - plural form",
  },

  // Account Detail Page

  // Transaction Review Table
  "plaid.transactionReview.noPendingTitle": {
    message: "Няма банкови транзакции",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message:
      "Всички транзакции са синхронизирани с главната ви книга или няма нови транзакции.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "Банкови транзакции",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message: "Прегледайте и изпратете {count} транзакции към главната си книга",
    description:
      "Card description for the transaction review table - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.description_one": {
    message: "Прегледайте и изпратете {count} транзакция към главната си книга",
    description:
      "Card description for the transaction review table - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.description_other": {
    message: "Прегледайте и изпратете {count} транзакции към главната си книга",
    description:
      "Card description for the transaction review table - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.submitting": {
    message: "Изпращане...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "Изпрати",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "Търсене по търговец или описание...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "Филтриране по банка",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "Всички банки",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "Филтриране по банкова сметка",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "Всички банкови сметки",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected_one": {
    message: "Избрана е {count} сметка",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_other": {
    message: "Избрани са {count} сметки",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "Няма транзакции, които да отговарят на текущите филтри.",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "Изчистване на филтрите",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message:
      "{count} избрани транзакции са скрити от текущите филтри, но въпреки това ще бъдат изпратени или изтрити.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.hiddenSelectedNotice_one": {
    message:
      "{count} избрана транзакция е скрита от текущите филтри, но въпреки това ще бъде изпратена или изтрита.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.hiddenSelectedNotice_other": {
    message:
      "{count} избрани транзакции са скрити от текущите филтри, но въпреки това ще бъдат изпратени или изтрити.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.setForSelected": {
    message: "Задай за избраните",
    description:
      "Button in the Target account column header that gives every selected transaction the same target account",
  },
  "plaid.transactionReview.setForSelectedNoSelection": {
    message: "Първо изберете транзакции, за да зададете целевата им сметка.",
    description:
      "Reason shown (tooltip and screen-reader text) while the Set for selected button is disabled because no transaction is selected",
  },
  "plaid.transactionReview.bulkTitle": {
    message: "Задайте целева сметка за {count} избрани транзакции",
    description:
      "Heading of the Set for selected panel - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkTitle_one": {
    message: "Задайте целева сметка за {count} избрана транзакция",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkTitle_other": {
    message: "Задайте целева сметка за {count} избрани транзакции",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote": {
    message:
      "{count} от тях са скрити от текущите филтри и също ще бъдат зададени.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkHiddenNote_one": {
    message:
      "{count} от тях е скрита от текущите филтри и също ще бъде зададена.",
    description:
      "Note in the Set for selected panel when a selected row falls outside the active filters - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkHiddenNote_other": {
    message:
      "{count} от тях са скрити от текущите филтри и също ще бъдат зададени.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting": {
    message: "Замени и {count} вече зададени целеви сметки",
    description:
      "Switch label in the Set for selected panel; off keeps targets already set (AI Fill or hand-picked) - interpolation: {count} is how many selected rows already have a target (base key for pluralization)",
  },
  "plaid.transactionReview.bulkReplaceExisting_one": {
    message: "Замени и {count} вече зададена целева сметка",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkReplaceExisting_other": {
    message: "Замени и {count} вече зададени целеви сметки",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet": {
    message: "{count} транзакции ще получат тази сметка.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkWillSet_one": {
    message: "{count} транзакция ще получи тази сметка.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkWillSet_other": {
    message: "{count} транзакции ще получат тази сметка.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkApply": {
    message: "Приложи",
    description:
      "Button in the Set for selected panel that gives the selected transactions the chosen target account",
  },
  "plaid.transactionReview.toast.targetAccountSet": {
    message: "Целевата сметка е зададена",
    description:
      "Toast title after the Set for selected panel has applied an account",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription": {
    message: "{count} транзакции вече отиват към {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_one": {
    message: "{count} транзакция вече отива към {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - singular form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_other": {
    message: "{count} транзакции вече отиват към {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "Изберете в кой файл да импортирате",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message:
      "{count} избрани транзакции се нуждаят от целеви сметки преди изпращане.",
    description:
      "Alert message for missing target accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.missingAccountsAlert_one": {
    message:
      "{count} избрана транзакция се нуждае от целева сметка преди изпращане.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.missingAccountsAlert_other": {
    message:
      "{count} избрани транзакции се нуждаят от целеви сметки преди изпращане.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.selectAll": {
    message: "Избери всички",
    description: "Checkbox label to select all transactions",
  },
  "plaid.transactionReview.date": {
    message: "Дата",
    description: "Table header for date column",
  },
  "plaid.transactionReview.source": {
    message: "Банка",
    description: "Table header for the source institution/account column",
  },
  "plaid.transactionReview.sourceAccount": {
    message: "Изходна сметка",
    description:
      "Table header for the editable Beancount source-account column, defaults from the account mapping",
  },
  "plaid.transactionReview.merchant": {
    message: "Търговец",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "Описание",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "Сума",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "Целева сметка",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "AI обработва...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "Попълване с AI",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "Изберете сметка...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "Категоризацията завърши",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_one": {
    message: "AI предложи сметки за {count} транзакция.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_other": {
    message: "AI предложи сметки за {count} транзакции.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "Категоризацията е неуспешна",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message: "Транзакциите не можаха да бъдат категоризирани. Опитайте отново.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "Няма избрани транзакции",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "Изберете поне една транзакция за изпращане.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "Липсват целеви сметки",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message: "{count} избрани транзакции се нуждаят от целеви сметки.",
    description:
      "Toast description for missing accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_one": {
    message: "{count} избрана транзакция се нуждае от целева сметка.",
    description:
      "Toast description for missing accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_other": {
    message: "{count} избрани транзакции се нуждаят от целеви сметки.",
    description:
      "Toast description for missing accounts - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "Транзакциите са изпратени",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_one": {
    message: "{count} транзакция е добавена към главната ви книга.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_other": {
    message: "{count} транзакции са добавени към главната ви книга.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "Изпращането е неуспешно",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "Транзакциите не можаха да бъдат изпратени. Опитайте отново.",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "Изтриване",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "Изтриване...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "Изтриване на транзакциите?",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message:
      "Това ще премахне завинаги {count} избрани транзакции от този списък. Действието не може да бъде отменено.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.deleteConfirmDescription_one": {
    message:
      "Това ще премахне завинаги {count} избрана транзакция от този списък. Действието не може да бъде отменено.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.deleteConfirmDescription_other": {
    message:
      "Това ще премахне завинаги {count} избрани транзакции от този списък. Действието не може да бъде отменено.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "Транзакциите са изтрити",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "{count} транзакции са премахнати от този списък.",
    description:
      "Toast description for deleted transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_one": {
    message: "{count} транзакция е премахната от този списък.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_other": {
    message: "{count} транзакции са премахнати от този списък.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "Изтриването е неуспешно",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "Транзакциите не можаха да бъдат изтрити. Опитайте отново.",
    description: "Toast description for deletion failure",
  },
  "plaid.institutionNotFound": {
    message: "Институцията не е намерена",
    description: "Empty state when a Plaid institution is unavailable",
  },
  "plaid.thisInstitution": {
    message: "тази институция",
    description: "Fallback name for a Plaid institution",
  },
  "plaid.transactionReview.selectTransaction": {
    message: "Изберете транзакция {transaction}",
    description: "Accessible label for selecting a Plaid transaction",
  },
  "plaid.connection.cancelled": {
    message: "Връзката е отменена",
    description: "Toast title when Plaid connection is cancelled",
  },
  "plaid.connection.linkClosed": {
    message: "Plaid Link беше затворен.",
    description: "Toast description when Plaid Link closes",
  },
  "plaid.connection.alreadyExists": {
    message: "Връзката вече съществува",
    description: "Toast title for a duplicate Plaid connection",
  },
  "plaid.connection.alreadyExistsDescription": {
    message:
      "Вече имате активна връзка с {institution}. Моля, първо прекъснете съществуващата връзка.",
    description: "Toast description for a duplicate Plaid connection",
  },
  "plaid.connection.failed": {
    message: "Неуспешна връзка",
    description: "Toast title when Plaid connection fails",
  },
  "plaid.connection.connecting": {
    message: "Свързване...",
    description: "Status while connecting a bank",
  },
  "plaid.connection.preparing": {
    message: "Подготвя се...",
    description: "Status while preparing Plaid Link",
  },
  "plaid.connection.waitingForAuthorization": {
    message: "Изчакване на разрешение…",
    description: "Status while waiting for Plaid authorization",
  },
  "plaid.connection.finalizing": {
    message: "Финализиране...",
    description: "Status while finalizing a Plaid connection",
  },
  "plaid.reauth.reconnected": {
    message: "Банката е свързана отново",
    description: "Toast title after reconnecting a bank",
  },
  "plaid.reauth.reconnectedDescription": {
    message: "Вашата банкова сметка бе успешно свързана отново.",
    description: "Toast description after reconnecting a bank",
  },
  "plaid.reauth.statusUpdateFailed": {
    message: "Неуспешна актуализация на състоянието",
    description: "Toast title when a reconnected bank status cannot update",
  },
  "plaid.reauth.statusUpdateFailedDescription": {
    message:
      "Повторното свързване бе успешно, но не успя да актуализира състоянието. Моля, опреснете страницата.",
    description:
      "Toast description when status update fails after reconnection",
  },
  "plaid.reauth.cancelled": {
    message: "Повторното свързване е отменено",
    description: "Toast title when bank reconnection is cancelled",
  },
  "plaid.reauth.linkClosed": {
    message: "Plaid Link беше затворен без повторно свързване.",
    description: "Toast description when Plaid Link closes during reconnection",
  },
  "plaid.reauth.failed": {
    message: "Неуспешно повторно свързване",
    description: "Toast title when bank reconnection fails",
  },
  "plaid.reauth.reconnecting": {
    message: "Повторно свързване...",
    description: "Status while reconnecting a bank",
  },
  "plaid.reauth.updatingStatus": {
    message: "Състоянието се актуализира...",
    description: "Status while updating a reconnected bank",
  },
};

export default bgPlaid;
