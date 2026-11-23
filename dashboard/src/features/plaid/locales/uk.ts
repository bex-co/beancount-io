export interface TranslationEntry {
  message: string;
  description: string;
}

const ukPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.pageTitle": {
    message: "Підключені рахунки",
    description:
      "Page heading for ledger bank connections and imported transactions",
  },
  "plaid.access.adminOnly": {
    message:
      "Лише власник облікової книги або адміністратор може підключати банки й керувати ними.",
    description:
      "Notice shown when the viewer cannot administer ledger bank connections",
  },
  "plaid.connectedSuccessfully": {
    message: "✓ Успішно підключено",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "Банківська синхронізація",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "Підключити рахунок",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message:
      "Автоматичний імпорт транзакцій із надійним шифруванням банківського рівня",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "Спростіть ведення обліку",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "Підключіть банківські рахунки через Plaid, щоб автоматично імпортувати транзакції, заощаджувати години ручного введення даних і підтримувати книгу в актуальному стані в реальному часі.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "Понад 11 000 установ",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "Безпека банківського рівня",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "Синхронізація в реальному часі",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "Почати",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "Навіщо підключати банк?",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "Автоматичний імпорт",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "Заощаджуйте години ручного введення: транзакції з ваших банківських рахунків імпортуються автоматично в реальному часі. Зосередьтеся на аналізі, а не на введенні даних.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "Безпека банківського рівня",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid використовує 256-бітне шифрування, і йому довіряють тисячі фінансових установ. Ваші облікові дані ніколи не зберігаються на наших серверах.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "Конфіденційність понад усе",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "Ми ніколи не зберігаємо ваші банківські облікові дані й не продаємо ваші дані. Ваша фінансова інформація захищена провідними галузевими стандартами конфіденційності.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "Як це працює",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "Підключіть банківський рахунок за кілька простих кроків",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "Виберіть банк",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message: "Шукайте серед понад 11 000 підтримуваних фінансових установ",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "Безпечна автентифікація",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message: "Безпечно увійдіть через систему автентифікації вашого банку",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "Почніть імпорт",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message: "Ваші транзакції автоматично синхронізуватимуться з книгою",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "Підключити ще один банк",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "Підключити банк",
    description:
      "Button text to connect a bank, shown on the connections page when no bank is connected yet",
  },
  "plaid.management.connectionsTitle": {
    message: "Підключення до банків",
    description: "Section title for the list of connected banks",
  },
  "plaid.management.connectionsSubtitle": {
    message:
      "Керуйте зіставленням рахунків, синхронізацією та відключенням банків.",
    description: "Section subtitle for the list of connected banks",
  },
  "plaid.management.noConnectionsTitle": {
    message: "Немає підключених банків",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message: "Підключіть банк, щоб автоматично імпортувати транзакції.",
    description:
      "Empty state description on the connections page when no bank is connected",
  },
  "plaid.management.sync": {
    message: "Синхронізувати",
    description: "Button text to sync transactions across every connected bank",
  },
  "plaid.management.syncing": {
    message: "Синхронізація...",
    description: "Button text while syncing every connected bank",
  },
  "plaid.management.manageBanks": {
    message: "Керування банками",
    description:
      "Button text linking to the dedicated bank-connection management page",
  },
  "plaid.management.backToTransactions": {
    message: "Назад до транзакцій",
    description:
      "Back button text on the manage-banks page, returning to the transaction review page",
  },
  "plaid.management.toast.error": {
    message: "Помилка",
    description: "Generic error toast title",
  },
  "plaid.management.toast.syncAllComplete": {
    message: "Синхронізацію завершено",
    description: "Toast title after syncing every connected bank",
  },
  "plaid.management.toast.syncAllCompleteDescription": {
    message: "З {banks} {transactions}.",
    description:
      "Toast description after syncing every connected bank - interpolation: {transactions} is plaid.management.toast.syncAllTransactionsPart, {banks} is plaid.management.toast.syncAllBanksPart; each fragment is pluralized on its own count",
  },
  "plaid.management.toast.syncAllTransactionsPart": {
    message: "синхронізовано {count} нових транзакцій",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllTransactionsPart_one": {
    message: "синхронізовано {count} нову транзакцію",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllTransactionsPart_few": {
    message: "синхронізовано {count} нові транзакції",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.management.toast.syncAllTransactionsPart_many": {
    message: "синхронізовано {count} нових транзакцій",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.management.toast.syncAllTransactionsPart_other": {
    message: "синхронізовано {count} нової транзакції",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - form for fractional counts",
  },
  "plaid.management.toast.syncAllBanksPart": {
    message: "{count} банків",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllBanksPart_one": {
    message: "{count} банку",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllBanksPart_few": {
    message: "{count} банків",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.management.toast.syncAllBanksPart_many": {
    message: "{count} банків",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.management.toast.syncAllBanksPart_other": {
    message: "{count} банку",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - form for fractional counts",
  },
  "plaid.management.toast.syncAllSkipped": {
    message: "{count} банків потрібно підключити повторно",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllSkipped_one": {
    message: "{count} банк потрібно підключити повторно",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllSkipped_few": {
    message: "{count} банки потрібно підключити повторно",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.management.toast.syncAllSkipped_many": {
    message: "{count} банків потрібно підключити повторно",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.management.toast.syncAllSkipped_other": {
    message: "{count} банку потрібно підключити повторно",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - form for fractional counts",
  },
  "plaid.management.toast.syncAllFailedDescription": {
    message: "Не вдалося синхронізувати транзакції. Спробуйте ще раз.",
    description: "Toast description when Sync All fails",
  },

  // Bank Account List
  "plaid.bankAccount.linkedOn": {
    message: "Прив’язано {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "Активний",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "Потрібна повторна авторизація",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "Вимкнено",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "Остання синхронізація",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount_one": {
    message: "{count} транзакція",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_few": {
    message: "{count} транзакції",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_many": {
    message: "{count} транзакцій",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_other": {
    message: "{count} транзакції",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "Помилка",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "Повторне підключення...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "Перепідключити банк",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "Відключення...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "Відключити",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "Відключити банківський рахунок",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "Ви впевнені, що хочете відключити {institutionName}? Усі підключені рахунки буде видалено, а автоматичну синхронізацію транзакцій зупинено.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "Скасувати",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "Банк відключено",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "{institutionName} відключено.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "Помилка",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "Не вдалося відключити банківський рахунок.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message:
      "Виберіть банківський рахунок, щоб налаштувати зіставлення рахунків",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "Для цього банку рахунків не знайдено",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "Керування рахунками",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "Додайте або вилучіть рахунки, якими ділиться цей банк",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "Спочатку повторно підключіть цей банк",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "Додати рахунки",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "Оновлення рахунків...",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "Підготовка...",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "Очікування відповіді банку...",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "Застосування змін...",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "Рахунки оновлено",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "Додано: {added}, вилучено: {removed}.",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "Змін у рахунках немає",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "Нічого не змінилося. Деякі банки дозволяють змінювати перелік спільних рахунків лише у власному застосунку або на сайті.",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "Не вдалося оновити рахунки",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message:
      "Можливо, банк зберіг зміну. Відкрийте «Керування рахунками» ще раз і спробуйте знову.",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "Зміни рахунків скасовано",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "Plaid Link закрито без зміни рахунків.",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "Рахунки",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.currency": {
    message: "Валюта",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "Рахунок Beancount",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "Збереження...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "Зберегти",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "Скасувати",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "Не зіставлено",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "Редагувати",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "Задати зіставлення",
    description: "Button text to set mapping for unmapped account",
  },
  "plaid.accountMapping.aiSuggested": {
    message: "Запропоновано ШІ",
    description: "Badge/hint shown next to an AI-prefilled account mapping",
  },
  "plaid.accountMapping.suggestedAccount": {
    message: "ШІ пропонує: {account}",
    description:
      "Inline hint showing the AI-suggested account for an unmapped account - interpolation: {account}",
  },
  "plaid.accountMapping.suggesting": {
    message: "Отримання пропозицій ШІ...",
    description: "Loading label while AI mapping suggestions are fetched",
  },
  "plaid.accountMapping.acceptAllSuggestions": {
    message: "Прийняти всі пропозиції ({count})",
    description:
      "Button text to accept every AI-suggested mapping at once - interpolation: {count}",
  },
  "plaid.accountMapping.accepting": {
    message: "Прийняття...",
    description: "Button text while accepting all suggestions",
  },

  // Account Mapping - Toast Messages
  "plaid.accountMapping.toast.invalidAccount": {
    message: "Недійсний рахунок",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "Введіть дійсну назву рахунку Beancount.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "Зіставлення збережено",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} зіставлено з {ledgerAccount} ({currency})",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "Помилка",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "Не вдалося зберегти зіставлення рахунку.",
    description: "Toast description for save error",
  },
  "plaid.accountMapping.toast.acceptedAll": {
    message: "Пропозиції прийнято",
    description: "Toast title after accepting all AI mapping suggestions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription": {
    message: "За пропозиціями ШІ зіставлено {count} рахунків.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_one": {
    message: "За пропозиціями ШІ зіставлено {count} рахунок.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - singular form",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_few": {
    message: "За пропозиціями ШІ зіставлено {count} рахунки.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_many": {
    message: "За пропозиціями ШІ зіставлено {count} рахунків.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_other": {
    message: "За пропозиціями ШІ зіставлено {count} рахунку.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - form for fractional counts",
  },

  // Account Detail Page

  // Transaction Review Table
  "plaid.transactionReview.noPendingTitle": {
    message: "Немає банківських транзакцій",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message:
      "Усі транзакції синхронізовано з вашою книгою, або нових транзакцій немає.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "Банківські транзакції",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message: "Перевірте й надішліть до книги {count} транзакцій",
    description:
      "Card description for the transaction review table - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.description_one": {
    message: "Перевірте й надішліть до книги {count} транзакцію",
    description:
      "Card description for the transaction review table - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.description_few": {
    message: "Перевірте й надішліть до книги {count} транзакції",
    description:
      "Card description for the transaction review table - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.description_many": {
    message: "Перевірте й надішліть до книги {count} транзакцій",
    description:
      "Card description for the transaction review table - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.transactionReview.description_other": {
    message: "Перевірте й надішліть до книги {count} транзакції",
    description:
      "Card description for the transaction review table - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.submitting": {
    message: "Надсилання...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "Надіслати",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "Пошук за продавцем або описом...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "Фільтр за банком",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "Усі банки",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "Фільтр за банківським рахунком",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "Усі банківські рахунки",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected_one": {
    message: "Вибрано {count} рахунок",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_few": {
    message: "Вибрано {count} рахунки",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_many": {
    message: "Вибрано {count} рахунків",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_other": {
    message: "Вибрано {count} рахунку",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "Немає транзакцій, що відповідають поточним фільтрам.",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "Очистити фільтри",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message:
      "{count} вибраних транзакцій приховано поточними фільтрами, але їх усе одно буде надіслано або видалено.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.hiddenSelectedNotice_one": {
    message:
      "{count} вибрану транзакцію приховано поточними фільтрами, але її все одно буде надіслано або видалено.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.hiddenSelectedNotice_few": {
    message:
      "{count} вибрані транзакції приховано поточними фільтрами, але їх усе одно буде надіслано або видалено.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.hiddenSelectedNotice_many": {
    message:
      "{count} вибраних транзакцій приховано поточними фільтрами, але їх усе одно буде надіслано або видалено.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.transactionReview.hiddenSelectedNotice_other": {
    message:
      "{count} вибраної транзакції приховано поточними фільтрами, але їх усе одно буде надіслано або видалено.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.setForSelected": {
    message: "Задати для вибраних",
    description:
      "Button in the Target account column header that gives every selected transaction the same target account",
  },
  "plaid.transactionReview.setForSelectedNoSelection": {
    message: "Спершу виберіть транзакції, щоб задати їм цільовий рахунок.",
    description:
      "Reason shown (tooltip and screen-reader text) while the Set for selected button is disabled because no transaction is selected",
  },
  "plaid.transactionReview.bulkTitle": {
    message: "Задати цільовий рахунок для {count} вибраних транзакцій",
    description:
      "Heading of the Set for selected panel - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkTitle_one": {
    message: "Задати цільовий рахунок для {count} вибраної транзакції",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkTitle_few": {
    message: "Задати цільовий рахунок для {count} вибраних транзакцій",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkTitle_many": {
    message: "Задати цільовий рахунок для {count} вибраних транзакцій",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkTitle_other": {
    message: "Задати цільовий рахунок для {count} вибраних транзакцій",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote": {
    message:
      "{count} із них приховано поточними фільтрами, їх також буде задано.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkHiddenNote_one": {
    message:
      "{count} із них приховано поточними фільтрами, її також буде задано.",
    description:
      "Note in the Set for selected panel when a selected row falls outside the active filters - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkHiddenNote_few": {
    message:
      "{count} із них приховано поточними фільтрами, їх також буде задано.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote_many": {
    message:
      "{count} із них приховано поточними фільтрами, їх також буде задано.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote_other": {
    message:
      "{count} із них приховано поточними фільтрами, їх також буде задано.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting": {
    message: "Замінити також {count} уже заданих цільових рахунків",
    description:
      "Switch label in the Set for selected panel; off keeps targets already set (AI Fill or hand-picked) - interpolation: {count} is how many selected rows already have a target (base key for pluralization)",
  },
  "plaid.transactionReview.bulkReplaceExisting_one": {
    message: "Замінити також {count} уже заданий цільовий рахунок",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkReplaceExisting_few": {
    message: "Замінити також {count} уже задані цільові рахунки",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting_many": {
    message: "Замінити також {count} уже заданих цільових рахунків",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting_other": {
    message: "Замінити також {count} уже заданих цільових рахунків",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet": {
    message: "{count} транзакцій отримають цей рахунок.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkWillSet_one": {
    message: "{count} транзакція отримає цей рахунок.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkWillSet_few": {
    message: "{count} транзакції отримають цей рахунок.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet_many": {
    message: "{count} транзакцій отримають цей рахунок.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet_other": {
    message: "{count} транзакцій отримають цей рахунок.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkApply": {
    message: "Застосувати",
    description:
      "Button in the Set for selected panel that gives the selected transactions the chosen target account",
  },
  "plaid.transactionReview.toast.targetAccountSet": {
    message: "Цільовий рахунок задано",
    description:
      "Toast title after the Set for selected panel has applied an account",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription": {
    message: "{count} транзакцій тепер належать до рахунку {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_one": {
    message: "{count} транзакція тепер належить до рахунку {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - singular form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_few": {
    message: "{count} транзакції тепер належать до рахунку {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_many": {
    message: "{count} транзакцій тепер належать до рахунку {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_other": {
    message: "{count} транзакцій тепер належать до рахунку {account}.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "Виберіть, у який файл імпортувати",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message:
      "{count} вибраним транзакціям потрібні цільові рахунки перед надсиланням.",
    description:
      "Alert message for missing target accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.missingAccountsAlert_one": {
    message:
      "{count} вибраній транзакції потрібен цільовий рахунок перед надсиланням.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.missingAccountsAlert_few": {
    message:
      "{count} вибраним транзакціям потрібні цільові рахунки перед надсиланням.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.missingAccountsAlert_many": {
    message:
      "{count} вибраним транзакціям потрібні цільові рахунки перед надсиланням.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.transactionReview.missingAccountsAlert_other": {
    message:
      "{count} вибраним транзакціям потрібні цільові рахунки перед надсиланням.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.selectAll": {
    message: "Вибрати все",
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
    message: "Вихідний рахунок",
    description:
      "Table header for the editable Beancount source-account column, defaults from the account mapping",
  },
  "plaid.transactionReview.merchant": {
    message: "Продавець",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "Опис",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "Сума",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "Цільовий рахунок",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "ШІ...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "Заповнити з ШІ",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "Виберіть рахунок...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "Категоризацію завершено",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_one": {
    message: "ШІ запропонував рахунки для {count} транзакції.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_few": {
    message: "ШІ запропонував рахунки для {count} транзакцій.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_many": {
    message: "ШІ запропонував рахунки для {count} транзакцій.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_other": {
    message: "ШІ запропонував рахунки для {count} транзакції.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "Помилка категоризації",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message: "Не вдалося категоризувати транзакції. Спробуйте ще раз.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "Транзакції не вибрано",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "Виберіть принаймні одну транзакцію для надсилання.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "Не вказано цільові рахунки",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message: "{count} вибраним транзакціям потрібні цільові рахунки.",
    description:
      "Toast description for missing accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_one": {
    message: "{count} вибраній транзакції потрібен цільовий рахунок.",
    description:
      "Toast description for missing accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_few": {
    message: "{count} вибраним транзакціям потрібні цільові рахунки.",
    description:
      "Toast description for missing accounts - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_many": {
    message: "{count} вибраним транзакціям потрібні цільові рахунки.",
    description:
      "Toast description for missing accounts - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_other": {
    message: "{count} вибраним транзакціям потрібні цільові рахунки.",
    description:
      "Toast description for missing accounts - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "Транзакції надіслано",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_one": {
    message: "До книги додано {count} транзакцію.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_few": {
    message: "До книги додано {count} транзакції.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_many": {
    message: "До книги додано {count} транзакцій.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_other": {
    message: "До книги додано {count} транзакції.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "Помилка надсилання",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "Не вдалося надіслати транзакції. Спробуйте ще раз.",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "Видалити",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "Видалення...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "Видалити транзакції?",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message:
      "З цього списку буде назавжди видалено {count} вибраних транзакцій. Цю дію неможливо скасувати.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.deleteConfirmDescription_one": {
    message:
      "З цього списку буде назавжди видалено {count} вибрану транзакцію. Цю дію неможливо скасувати.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.deleteConfirmDescription_few": {
    message:
      "З цього списку буде назавжди видалено {count} вибрані транзакції. Цю дію неможливо скасувати.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.deleteConfirmDescription_many": {
    message:
      "З цього списку буде назавжди видалено {count} вибраних транзакцій. Цю дію неможливо скасувати.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.transactionReview.deleteConfirmDescription_other": {
    message:
      "З цього списку буде назавжди видалено {count} вибраної транзакції. Цю дію неможливо скасувати.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "Транзакції видалено",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "Із цього списку видалено {count} транзакцій.",
    description:
      "Toast description for deleted transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_one": {
    message: "Із цього списку видалено {count} транзакцію.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_few": {
    message: "Із цього списку видалено {count} транзакції.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - form for counts like 2-4",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_many": {
    message: "Із цього списку видалено {count} транзакцій.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - form for counts like 5-20",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_other": {
    message: "Із цього списку видалено {count} транзакції.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - form for fractional counts",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "Не вдалося видалити",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "Не вдалося видалити транзакції. Спробуйте ще раз.",
    description: "Toast description for deletion failure",
  },
  "plaid.institutionNotFound": {
    message: "Заклад не знайдено",
    description: "Empty state when a Plaid institution is unavailable",
  },
  "plaid.thisInstitution": {
    message: "цього закладу",
    description: "Fallback name for a Plaid institution",
  },
  "plaid.transactionReview.selectTransaction": {
    message: "Виберіть транзакцію {transaction}",
    description: "Accessible label for selecting a Plaid transaction",
  },
  "plaid.connection.cancelled": {
    message: "Підключення скасовано",
    description: "Toast title when Plaid connection is cancelled",
  },
  "plaid.connection.linkClosed": {
    message: "Plaid Link закрито.",
    description: "Toast description when Plaid Link closes",
  },
  "plaid.connection.alreadyExists": {
    message: "Підключення вже існує",
    description: "Toast title for a duplicate Plaid connection",
  },
  "plaid.connection.alreadyExistsDescription": {
    message:
      "У вас уже є активне підключення до {institution}. Спочатку від’єднайте наявне з’єднання.",
    description: "Toast description for a duplicate Plaid connection",
  },
  "plaid.connection.failed": {
    message: "Помилка підключення",
    description: "Toast title when Plaid connection fails",
  },
  "plaid.connection.connecting": {
    message: "Підключення…",
    description: "Status while connecting a bank",
  },
  "plaid.connection.preparing": {
    message: "Готується…",
    description: "Status while preparing Plaid Link",
  },
  "plaid.connection.waitingForAuthorization": {
    message: "Очікування авторизації…",
    description: "Status while waiting for Plaid authorization",
  },
  "plaid.connection.finalizing": {
    message: "Завершення…",
    description: "Status while finalizing a Plaid connection",
  },
  "plaid.reauth.reconnected": {
    message: "Банк відновлено",
    description: "Toast title after reconnecting a bank",
  },
  "plaid.reauth.reconnectedDescription": {
    message: "Ваш банківський рахунок успішно підключено.",
    description: "Toast description after reconnecting a bank",
  },
  "plaid.reauth.statusUpdateFailed": {
    message: "Не вдалося оновити статус",
    description: "Toast title when a reconnected bank status cannot update",
  },
  "plaid.reauth.statusUpdateFailedDescription": {
    message:
      "Повторне підключення вдалося, але не вдалося оновити статус. Будь ласка, оновіть сторінку.",
    description:
      "Toast description when status update fails after reconnection",
  },
  "plaid.reauth.cancelled": {
    message: "Повторне підключення скасовано",
    description: "Toast title when bank reconnection is cancelled",
  },
  "plaid.reauth.linkClosed": {
    message: "Plaid Link було закрито без повторного підключення.",
    description: "Toast description when Plaid Link closes during reconnection",
  },
  "plaid.reauth.failed": {
    message: "Помилка повторного підключення",
    description: "Toast title when bank reconnection fails",
  },
  "plaid.reauth.reconnecting": {
    message: "Повторне підключення…",
    description: "Status while reconnecting a bank",
  },
  "plaid.reauth.updatingStatus": {
    message: "Оновлення статусу…",
    description: "Status while updating a reconnected bank",
  },
};

export default ukPlaid;
