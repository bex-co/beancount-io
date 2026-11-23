export interface TranslationEntry {
  message: string;
  description: string;
}

const ruPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.pageTitle": {
    message: "Подключённые счета",
    description:
      "Page heading for ledger bank connections and imported transactions",
  },
  "plaid.access.adminOnly": {
    message:
      "Только владелец учётной книги или администратор может подключать банки и управлять ими.",
    description:
      "Notice shown when the viewer cannot administer ledger bank connections",
  },
  "plaid.connectedSuccessfully": {
    message: "✓ Успешно подключено",
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
      "Автоматический импорт транзакций с надёжным шифрованием банковского уровня",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "Упростите ведение учёта",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "Подключите банковские счета через Plaid, чтобы автоматически импортировать транзакции, экономить часы ручного ввода данных и поддерживать книгу в актуальном состоянии в реальном времени.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "Более 11 000 учреждений",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "Безопасность банковского уровня",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "Синхронизация в реальном времени",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "Начать",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "Зачем подключать банк?",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "Автоматический импорт",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "Экономьте часы ручного ввода: транзакции с ваших банковских счетов импортируются автоматически в реальном времени. Сосредоточьтесь на анализе, а не на вводе данных.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "Безопасность банковского уровня",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid использует 256-битное шифрование, и ему доверяют тысячи финансовых учреждений. Ваши учётные данные никогда не хранятся на наших серверах.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "Конфиденциальность прежде всего",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "Мы никогда не храним ваши банковские учётные данные и не продаём ваши данные. Ваша финансовая информация защищена ведущими отраслевыми стандартами конфиденциальности.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "Как это работает",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "Подключите банковский счёт за несколько простых шагов",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "Выберите банк",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message:
      "Ищите среди более чем 11 000 поддерживаемых финансовых учреждений",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "Безопасная аутентификация",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message: "Безопасно войдите через систему аутентификации вашего банка",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "Начните импорт",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message: "Ваши транзакции будут автоматически синхронизироваться с книгой",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "Подключить ещё один банк",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "Подключить банк",
    description:
      "Button text to connect a bank, shown on the connections page when no bank is connected yet",
  },
  "plaid.management.connectionsTitle": {
    message: "Подключения к банкам",
    description: "Section title for the list of connected banks",
  },
  "plaid.management.connectionsSubtitle": {
    message:
      "Управляйте сопоставлением счетов, синхронизацией и отключением банков.",
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
    message: "Синхронизировать",
    description: "Button text to sync transactions across every connected bank",
  },
  "plaid.management.syncing": {
    message: "Синхронизация...",
    description: "Button text while syncing every connected bank",
  },
  "plaid.management.manageBanks": {
    message: "Управление банками",
    description:
      "Button text linking to the dedicated bank-connection management page",
  },
  "plaid.management.backToTransactions": {
    message: "Назад к транзакциям",
    description:
      "Back button text on the manage-banks page, returning to the transaction review page",
  },
  "plaid.management.toast.error": {
    message: "Ошибка",
    description: "Generic error toast title",
  },
  "plaid.management.toast.syncAllComplete": {
    message: "Синхронизация завершена",
    description: "Toast title after syncing every connected bank",
  },
  "plaid.management.toast.syncAllCompleteDescription": {
    message: "Из {banks} {transactions}.",
    description:
      "Toast description after syncing every connected bank - interpolation: {transactions} is plaid.management.toast.syncAllTransactionsPart, {banks} is plaid.management.toast.syncAllBanksPart; each fragment is pluralized on its own count",
  },
  "plaid.management.toast.syncAllTransactionsPart": {
    message: "синхронизировано {count} новых транзакций",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllTransactionsPart_one": {
    message: "синхронизирована {count} новая транзакция",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllTransactionsPart_few": {
    message: "синхронизировано {count} новые транзакции",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.management.toast.syncAllTransactionsPart_many": {
    message: "синхронизировано {count} новых транзакций",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.management.toast.syncAllTransactionsPart_other": {
    message: "синхронизировано {count} новой транзакции",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - form for fractional counts",
  },
  "plaid.management.toast.syncAllBanksPart": {
    message: "{count} банков",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllBanksPart_one": {
    message: "{count} банка",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllBanksPart_few": {
    message: "{count} банков",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.management.toast.syncAllBanksPart_many": {
    message: "{count} банков",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.management.toast.syncAllBanksPart_other": {
    message: "{count} банка",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - form for fractional counts",
  },
  "plaid.management.toast.syncAllSkipped": {
    message: "{count} банков требуют повторного подключения",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllSkipped_one": {
    message: "{count} банк требует повторного подключения",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllSkipped_few": {
    message: "{count} банка требуют повторного подключения",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.management.toast.syncAllSkipped_many": {
    message: "{count} банков требуют повторного подключения",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.management.toast.syncAllSkipped_other": {
    message: "{count} банка требуют повторного подключения",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - form for fractional counts",
  },
  "plaid.management.toast.syncAllFailedDescription": {
    message: "Не удалось синхронизировать транзакции. Попробуйте ещё раз.",
    description: "Toast description when Sync All fails",
  },

  // Bank Account List
  "plaid.bankAccount.linkedOn": {
    message: "Привязан {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "Активен",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "Требуется повторная авторизация",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "Отключён",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "Последняя синхронизация",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount_one": {
    message: "{count} транзакция",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_few": {
    message: "{count} транзакции",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_many": {
    message: "{count} транзакций",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_other": {
    message: "{count} транзакции",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "Ошибка",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "Повторное подключение...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "Переподключить банк",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "Отключение...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "Отключить",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "Отключить банковский счёт",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "Вы уверены, что хотите отключить {institutionName}? Все подключённые счета будут удалены, а автоматическая синхронизация транзакций остановится.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "Отмена",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "Банк отключён",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "{institutionName} отключён.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "Ошибка",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "Не удалось отключить банковский счёт.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message: "Выберите банковский счёт, чтобы настроить сопоставление счетов",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "Для этого банка счета не найдены",
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
    message: "Валюта",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Счёт Beancount",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "Сохранение...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "Сохранить",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "Отмена",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "Не сопоставлен",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "Изменить",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "Задать сопоставление",
    description: "Button text to set mapping for unmapped account",
  },
  "plaid.accountMapping.aiSuggested": {
    message: "Предложено ИИ",
    description: "Badge/hint shown next to an AI-prefilled account mapping",
  },
  "plaid.accountMapping.suggestedAccount": {
    message: "ИИ предлагает: {account}",
    description:
      "Inline hint showing the AI-suggested account for an unmapped account - interpolation: {account}",
  },
  "plaid.accountMapping.suggesting": {
    message: "Получение предложений ИИ...",
    description: "Loading label while AI mapping suggestions are fetched",
  },
  "plaid.accountMapping.acceptAllSuggestions": {
    message: "Принять все предложения ({count})",
    description:
      "Button text to accept every AI-suggested mapping at once - interpolation: {count}",
  },
  "plaid.accountMapping.accepting": {
    message: "Принятие...",
    description: "Button text while accepting all suggestions",
  },

  // Account Mapping - Toast Messages
  "plaid.accountMapping.toast.invalidAccount": {
    message: "Недопустимый счёт",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "Введите допустимое имя счёта Beancount.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "Сопоставление сохранено",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} сопоставлен с {ledgerAccount} ({currency})",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "Ошибка",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "Не удалось сохранить сопоставление счёта.",
    description: "Toast description for save error",
  },
  "plaid.accountMapping.toast.acceptedAll": {
    message: "Предложения приняты",
    description: "Toast title after accepting all AI mapping suggestions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription": {
    message: "По предложениям ИИ сопоставлено {count} счетов.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_one": {
    message: "По предложениям ИИ сопоставлен {count} счет.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - singular form",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_few": {
    message: "По предложениям ИИ сопоставлено {count} счета.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_many": {
    message: "По предложениям ИИ сопоставлено {count} счетов.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_other": {
    message: "По предложениям ИИ сопоставлено {count} счета.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - form for fractional counts",
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
      "Все транзакции синхронизированы с вашей книгой, или новых транзакций нет.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "Банковские транзакции",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message: "Проверьте и отправьте в книгу {count} транзакций",
    description:
      "Card description for the transaction review table - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.description_one": {
    message: "Проверьте и отправьте в книгу {count} транзакцию",
    description:
      "Card description for the transaction review table - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.description_few": {
    message: "Проверьте и отправьте в книгу {count} транзакции",
    description:
      "Card description for the transaction review table - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.description_many": {
    message: "Проверьте и отправьте в книгу {count} транзакций",
    description:
      "Card description for the transaction review table - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.transactionReview.description_other": {
    message: "Проверьте и отправьте в книгу {count} транзакции",
    description:
      "Card description for the transaction review table - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.submitting": {
    message: "Отправка...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "Отправить",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "Поиск по продавцу или описанию...",
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
  "plaid.transactionReview.accountsSelected_one": {
    message: "Выбран {count} счёт",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_few": {
    message: "Выбрано {count} счёта",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_many": {
    message: "Выбрано {count} счетов",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_other": {
    message: "Выбрано {count} счёта",
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
      "{count} выбранных транзакций скрыто текущими фильтрами, но они всё равно будут отправлены или удалены.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.hiddenSelectedNotice_one": {
    message:
      "{count} выбранная транзакция скрыта текущими фильтрами, но всё равно будет отправлена или удалена.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.hiddenSelectedNotice_few": {
    message:
      "{count} выбранные транзакции скрыты текущими фильтрами, но всё равно будут отправлены или удалены.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.hiddenSelectedNotice_many": {
    message:
      "{count} выбранных транзакций скрыто текущими фильтрами, но они всё равно будут отправлены или удалены.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.transactionReview.hiddenSelectedNotice_other": {
    message:
      "{count} выбранной транзакции скрыто текущими фильтрами, но они всё равно будут отправлены или удалены.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.setForSelected": {
    message: "Задать для выбранных",
    description:
      "Button in the Target account column header that gives every selected transaction the same target account",
  },
  "plaid.transactionReview.setForSelectedNoSelection": {
    message: "Сначала выберите транзакции, чтобы задать им целевой счёт.",
    description:
      "Reason shown (tooltip and screen-reader text) while the Set for selected button is disabled because no transaction is selected",
  },
  "plaid.transactionReview.bulkTitle": {
    message: "Задать целевой счёт для {count} выбранных транзакций",
    description:
      "Heading of the Set for selected panel - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkTitle_one": {
    message: "Задать целевой счёт для {count} выбранной транзакции",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkTitle_few": {
    message: "Задать целевой счёт для {count} выбранных транзакций",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkTitle_many": {
    message: "Задать целевой счёт для {count} выбранных транзакций",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkTitle_other": {
    message: "Задать целевой счёт для {count} выбранных транзакций",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote": {
    message: "{count} из них скрыты текущими фильтрами и тоже будут заданы.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkHiddenNote_one": {
    message: "{count} из них скрыта текущими фильтрами и тоже будет задана.",
    description:
      "Note in the Set for selected panel when a selected row falls outside the active filters - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkHiddenNote_few": {
    message: "{count} из них скрыты текущими фильтрами и тоже будут заданы.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote_many": {
    message: "{count} из них скрыты текущими фильтрами и тоже будут заданы.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote_other": {
    message: "{count} из них скрыты текущими фильтрами и тоже будут заданы.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting": {
    message: "Заменить также {count} уже заданных целевых счетов",
    description:
      "Switch label in the Set for selected panel; off keeps targets already set (AI Fill or hand-picked) - interpolation: {count} is how many selected rows already have a target (base key for pluralization)",
  },
  "plaid.transactionReview.bulkReplaceExisting_one": {
    message: "Заменить также {count} уже заданный целевой счёт",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkReplaceExisting_few": {
    message: "Заменить также {count} уже заданных целевых счёта",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting_many": {
    message: "Заменить также {count} уже заданных целевых счетов",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting_other": {
    message: "Заменить также {count} уже заданных целевых счетов",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet": {
    message: "{count} транзакций получат этот счёт.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkWillSet_one": {
    message: "{count} транзакция получит этот счёт.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkWillSet_few": {
    message: "{count} транзакции получат этот счёт.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet_many": {
    message: "{count} транзакций получат этот счёт.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet_other": {
    message: "{count} транзакций получат этот счёт.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkApply": {
    message: "Применить",
    description:
      "Button in the Set for selected panel that gives the selected transactions the chosen target account",
  },
  "plaid.transactionReview.toast.targetAccountSet": {
    message: "Целевой счёт задан",
    description:
      "Toast title after the Set for selected panel has applied an account",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription": {
    message: "{count} транзакций теперь относятся к счёту {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_one": {
    message: "{count} транзакция теперь относится к счёту {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - singular form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_few": {
    message: "{count} транзакции теперь относятся к счёту {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_many": {
    message: "{count} транзакций теперь относятся к счёту {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_other": {
    message: "{count} транзакций теперь относятся к счёту {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "Выберите, в какой файл импортировать",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message:
      "{count} выбранным транзакциям нужны целевые счета перед отправкой.",
    description:
      "Alert message for missing target accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.missingAccountsAlert_one": {
    message: "{count} выбранной транзакции нужен целевой счет перед отправкой.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.missingAccountsAlert_few": {
    message:
      "{count} выбранным транзакциям нужны целевые счета перед отправкой.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.missingAccountsAlert_many": {
    message:
      "{count} выбранным транзакциям нужны целевые счета перед отправкой.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.transactionReview.missingAccountsAlert_other": {
    message:
      "{count} выбранным транзакциям нужны целевые счета перед отправкой.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.selectAll": {
    message: "Выбрать все",
    description: "Checkbox label to select all transactions",
  },
  "plaid.transactionReview.date": {
    message: "Дата",
    description: "Table header for date column",
  },
  "plaid.transactionReview.source": {
    message: "Банк",
    description: "Table header for the source institution/account column",
  },
  "plaid.transactionReview.sourceAccount": {
    message: "Исходный счёт",
    description:
      "Table header for the editable Beancount source-account column, defaults from the account mapping",
  },
  "plaid.transactionReview.merchant": {
    message: "Продавец",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "Описание",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "Сумма",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "Целевой счёт",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "ИИ...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "Заполнить с ИИ",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "Выберите счёт...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "Категоризация завершена",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_one": {
    message: "ИИ предложил счета для {count} транзакции.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_few": {
    message: "ИИ предложил счета для {count} транзакций.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_many": {
    message: "ИИ предложил счета для {count} транзакций.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_other": {
    message: "ИИ предложил счета для {count} транзакции.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "Ошибка категоризации",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message: "Не удалось категоризировать транзакции. Попробуйте ещё раз.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "Транзакции не выбраны",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "Выберите хотя бы одну транзакцию для отправки.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "Не указаны целевые счета",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message: "{count} выбранным транзакциям нужны целевые счета.",
    description:
      "Toast description for missing accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_one": {
    message: "{count} выбранной транзакции нужен целевой счет.",
    description:
      "Toast description for missing accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_few": {
    message: "{count} выбранным транзакциям нужны целевые счета.",
    description:
      "Toast description for missing accounts - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_many": {
    message: "{count} выбранным транзакциям нужны целевые счета.",
    description:
      "Toast description for missing accounts - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_other": {
    message: "{count} выбранным транзакциям нужны целевые счета.",
    description:
      "Toast description for missing accounts - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "Транзакции отправлены",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_one": {
    message: "В книгу добавлена {count} транзакция.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_few": {
    message: "В книгу добавлены {count} транзакции.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_many": {
    message: "В книгу добавлено {count} транзакций.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_other": {
    message: "В книгу добавлено {count} транзакции.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "Ошибка отправки",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "Не удалось отправить транзакции. Попробуйте ещё раз.",
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
      "Из этого списка будет навсегда удалено {count} выбранных транзакций. Это действие нельзя отменить.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.deleteConfirmDescription_one": {
    message:
      "Из этого списка будет навсегда удалена {count} выбранная транзакция. Это действие нельзя отменить.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.deleteConfirmDescription_few": {
    message:
      "Из этого списка будут навсегда удалены {count} выбранные транзакции. Это действие нельзя отменить.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.deleteConfirmDescription_many": {
    message:
      "Из этого списка будет навсегда удалено {count} выбранных транзакций. Это действие нельзя отменить.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.transactionReview.deleteConfirmDescription_other": {
    message:
      "Из этого списка будет навсегда удалено {count} выбранной транзакции. Это действие нельзя отменить.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "Транзакции удалены",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "Из этого списка удалено {count} транзакций.",
    description:
      "Toast description for deleted transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_one": {
    message: "Из этого списка удалена {count} транзакция.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_few": {
    message: "Из этого списка удалены {count} транзакции.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_many": {
    message: "Из этого списка удалено {count} транзакций.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_other": {
    message: "Из этого списка удалено {count} транзакции.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "Не удалось удалить",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "Не удалось удалить транзакции. Повторите попытку.",
    description: "Toast description for deletion failure",
  },
  "plaid.institutionNotFound": {
    message: "Учреждение не найдено",
    description: "Empty state when a Plaid institution is unavailable",
  },
  "plaid.thisInstitution": {
    message: "это учреждение",
    description: "Fallback name for a Plaid institution",
  },
  "plaid.transactionReview.selectTransaction": {
    message: "Выберите транзакцию {transaction}",
    description: "Accessible label for selecting a Plaid transaction",
  },
  "plaid.connection.cancelled": {
    message: "Соединение отменено",
    description: "Toast title when Plaid connection is cancelled",
  },
  "plaid.connection.linkClosed": {
    message: "Плед Ссылка закрыта.",
    description: "Toast description when Plaid Link closes",
  },
  "plaid.connection.alreadyExists": {
    message: "Соединение уже существует",
    description: "Toast title for a duplicate Plaid connection",
  },
  "plaid.connection.alreadyExistsDescription": {
    message:
      "У вас уже есть активное соединение с {institution}. Пожалуйста, сначала отключите существующее соединение.",
    description: "Toast description for a duplicate Plaid connection",
  },
  "plaid.connection.failed": {
    message: "Соединение не удалось",
    description: "Toast title when Plaid connection fails",
  },
  "plaid.connection.connecting": {
    message: "Подключение…",
    description: "Status while connecting a bank",
  },
  "plaid.connection.preparing": {
    message: "Подготовка…",
    description: "Status while preparing Plaid Link",
  },
  "plaid.connection.waitingForAuthorization": {
    message: "Ожидание авторизации…",
    description: "Status while waiting for Plaid authorization",
  },
  "plaid.connection.finalizing": {
    message: "Завершение…",
    description: "Status while finalizing a Plaid connection",
  },
  "plaid.reauth.reconnected": {
    message: "Банк восстановлен",
    description: "Toast title after reconnecting a bank",
  },
  "plaid.reauth.reconnectedDescription": {
    message: "Ваш банковский счет успешно восстановлен.",
    description: "Toast description after reconnecting a bank",
  },
  "plaid.reauth.statusUpdateFailed": {
    message: "Обновление статуса не выполнено",
    description: "Toast title when a reconnected bank status cannot update",
  },
  "plaid.reauth.statusUpdateFailedDescription": {
    message:
      "Повторное подключение выполнено, но не удалось обновить статус. Пожалуйста, обновите страницу.",
    description:
      "Toast description when status update fails after reconnection",
  },
  "plaid.reauth.cancelled": {
    message: "Повторное подключение отменено",
    description: "Toast title when bank reconnection is cancelled",
  },
  "plaid.reauth.linkClosed": {
    message: "Plaid Link закрылся без повторного подключения.",
    description: "Toast description when Plaid Link closes during reconnection",
  },
  "plaid.reauth.failed": {
    message: "Не удалось переподключиться",
    description: "Toast title when bank reconnection fails",
  },
  "plaid.reauth.reconnecting": {
    message: "Воссоединение…",
    description: "Status while reconnecting a bank",
  },
  "plaid.reauth.updatingStatus": {
    message: "Обновление статуса…",
    description: "Status while updating a reconnected bank",
  },
};

export default ruPlaid;
