export interface TranslationEntry {
  message: string;
  description: string;
}

const faPlaid: Record<string, TranslationEntry> = {
  // Common
  "plaid.pageTitle": {
    message: "حساب‌های متصل",
    description:
      "Page heading for ledger bank connections and imported transactions",
  },
  "plaid.access.adminOnly": {
    message:
      "فقط مالک دفتر حسابداری یا یک مدیر می‌تواند بانک‌ها را متصل و مدیریت کند.",
    description:
      "Notice shown when the viewer cannot administer ledger bank connections",
  },
  "plaid.connectedSuccessfully": {
    message: "✓ با موفقیت متصل شد",
    description: "Success message shown when bank is connected",
  },
  "plaid.sidebar.label": {
    message: "همگام‌سازی بانکی",
    description:
      "Main ledger sidebar nav label for the bank/Plaid page — a stable noun that covers both the not-yet-connected (connect a bank) and already-connected (review bank transactions) states, unlike an action phrase such as 'Connect Bank'",
  },

  // Onboarding State - Header
  "plaid.onboarding.title": {
    message: "اتصال یک حساب",
    description: "Main title for onboarding page",
  },
  "plaid.onboarding.subtitle": {
    message: "وارد کردن خودکار تراکنش‌ها با رمزگذاری امن در سطح بانکی",
    description: "Subtitle for onboarding page",
  },

  // Onboarding State - Hero Section
  "plaid.onboarding.hero.title": {
    message: "گردش کار حسابداری خود را ساده کنید",
    description: "Hero section title",
  },
  "plaid.onboarding.hero.description": {
    message:
      "حساب‌های بانکی خود را از طریق Plaid متصل کنید تا تراکنش‌ها به‌طور خودکار وارد شوند، ساعت‌ها در ورود دستی داده‌ها صرفه‌جویی کنید و دفتر کل خود را به‌صورت لحظه‌ای به‌روز نگه دارید.",
    description: "Hero section description",
  },
  "plaid.onboarding.hero.institutionsCount": {
    message: "بیش از ۱۱٬۰۰۰ موسسه",
    description: "Feature highlight - number of supported institutions",
  },
  "plaid.onboarding.hero.bankLevelSecurity": {
    message: "امنیت در سطح بانکی",
    description: "Feature highlight - security feature",
  },
  "plaid.onboarding.hero.realTimeSync": {
    message: "همگام‌سازی لحظه‌ای",
    description: "Feature highlight - real-time syncing",
  },
  "plaid.onboarding.getStarted": {
    message: "شروع کنید",
    description: "Button text to start connecting bank",
  },

  // Onboarding State - Benefits
  "plaid.onboarding.benefits.title": {
    message: "چرا بانک خود را متصل کنید؟",
    description: "Benefits section title",
  },
  "plaid.onboarding.benefits.automaticImport.title": {
    message: "ورود خودکار",
    description: "Benefit card title for automatic import",
  },
  "plaid.onboarding.benefits.automaticImport.description": {
    message:
      "با وارد کردن خودکار و لحظه‌ای تراکنش‌ها از حساب‌های بانکی خود، ساعت‌ها در ورود دستی صرفه‌جویی کنید. به جای ورود داده‌ها، روی تحلیل تمرکز کنید.",
    description: "Benefit card description for automatic import",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.title": {
    message: "امنیت در سطح بانکی",
    description: "Benefit card title for security",
  },
  "plaid.onboarding.benefits.bankLevelSecurity.description": {
    message:
      "Plaid از رمزگذاری ۲۵۶ بیتی استفاده می‌کند و هزاران موسسه مالی به آن اعتماد دارند. اطلاعات ورود شما هرگز روی سرورهای ما ذخیره نمی‌شود.",
    description: "Benefit card description for security",
  },
  "plaid.onboarding.benefits.privacyFirst.title": {
    message: "اولویت با حریم خصوصی",
    description: "Benefit card title for privacy",
  },
  "plaid.onboarding.benefits.privacyFirst.description": {
    message:
      "ما هرگز اطلاعات ورود بانکی شما را ذخیره نمی‌کنیم و داده‌هایتان را نمی‌فروشیم. اطلاعات مالی شما با استانداردهای پیشرو حریم خصوصی محافظت می‌شود.",
    description: "Benefit card description for privacy",
  },

  // Onboarding State - How It Works
  "plaid.onboarding.howItWorks.title": {
    message: "نحوه کار",
    description: "How it works section title",
  },
  "plaid.onboarding.howItWorks.description": {
    message: "حساب بانکی خود را تنها در چند مرحله ساده متصل کنید",
    description: "How it works section description",
  },
  "plaid.onboarding.howItWorks.step1.title": {
    message: "بانک خود را انتخاب کنید",
    description: "Step 1 title",
  },
  "plaid.onboarding.howItWorks.step1.description": {
    message: "در میان بیش از ۱۱٬۰۰۰ موسسه مالی پشتیبانی‌شده جستجو کنید",
    description: "Step 1 description",
  },
  "plaid.onboarding.howItWorks.step2.title": {
    message: "احراز هویت امن",
    description: "Step 2 title",
  },
  "plaid.onboarding.howItWorks.step2.description": {
    message: "از طریق سیستم احراز هویت بانک خود به‌صورت امن وارد شوید",
    description: "Step 2 description",
  },
  "plaid.onboarding.howItWorks.step3.title": {
    message: "شروع وارد کردن",
    description: "Step 3 title",
  },
  "plaid.onboarding.howItWorks.step3.description": {
    message: "تراکنش‌های شما به‌طور خودکار با دفتر کل شما همگام‌سازی می‌شوند",
    description: "Step 3 description",
  },

  // Management State
  "plaid.management.connectAnother": {
    message: "اتصال بانکی دیگر",
    description:
      "Button text to connect another bank, shown when at least one bank is already connected",
  },
  "plaid.management.connectBank": {
    message: "اتصال یک بانک",
    description:
      "Button text to connect a bank, shown on the connections page when no bank is connected yet",
  },
  "plaid.management.connectionsTitle": {
    message: "اتصال‌های بانکی",
    description: "Section title for the list of connected banks",
  },
  "plaid.management.connectionsSubtitle": {
    message: "نگاشت حساب‌ها، همگام‌سازی و قطع اتصال بانک‌ها را مدیریت کنید.",
    description: "Section subtitle for the list of connected banks",
  },
  "plaid.management.noConnectionsTitle": {
    message: "بدون بانک متصل",
    description:
      "Empty state title on the connections page when no bank is connected",
  },
  "plaid.management.noConnectionsDescription": {
    message: "برای وارد کردن خودکار تراکنش‌ها، یک بانک متصل کنید.",
    description:
      "Empty state description on the connections page when no bank is connected",
  },
  "plaid.management.sync": {
    message: "همگام‌سازی",
    description: "Button text to sync transactions across every connected bank",
  },
  "plaid.management.syncing": {
    message: "در حال همگام‌سازی...",
    description: "Button text while syncing every connected bank",
  },
  "plaid.management.manageBanks": {
    message: "مدیریت بانک‌ها",
    description:
      "Button text linking to the dedicated bank-connection management page",
  },
  "plaid.management.toast.error": {
    message: "خطا",
    description: "Generic error toast title",
  },
  "plaid.management.toast.syncAllComplete": {
    message: "همگام‌سازی کامل شد",
    description: "Toast title after syncing every connected bank",
  },
  "plaid.management.toast.syncAllCompleteDescription": {
    message: "{transactions} از {banks} همگام‌سازی شد.",
    description:
      "Toast description after syncing every connected bank - interpolation: {transactions} is plaid.management.toast.syncAllTransactionsPart, {banks} is plaid.management.toast.syncAllBanksPart; each fragment is pluralized on its own count",
  },
  "plaid.management.toast.syncAllTransactionsPart": {
    message: "{count} تراکنش جدید",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllTransactionsPart_one": {
    message: "{count} تراکنش جدید",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllTransactionsPart_other": {
    message: "{count} تراکنش جدید",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {transactions}: the number of new transactions synced, worded to fit that sentence - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllBanksPart": {
    message: "{count} بانک",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllBanksPart_one": {
    message: "{count} بانک",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllBanksPart_other": {
    message: "{count} بانک",
    description:
      "Fragment of plaid.management.toast.syncAllCompleteDescription filling {banks}: the number of banks synced, in the grammatical case that sentence needs - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllSkipped": {
    message: "{count} بانک نیاز به اتصال مجدد دارد",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} (base key for pluralization)",
  },
  "plaid.management.toast.syncAllSkipped_one": {
    message: "{count} بانک نیاز به اتصال مجدد دارد",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - singular form",
  },
  "plaid.management.toast.syncAllSkipped_other": {
    message: "{count} بانک نیاز به اتصال مجدد دارد",
    description:
      "Toast title noting banks skipped by Sync All because they require reauthentication - interpolation: {count} - plural form",
  },
  "plaid.management.toast.syncAllFailedDescription": {
    message: "همگام‌سازی تراکنش‌ها ناموفق بود. لطفاً دوباره تلاش کنید.",
    description: "Toast description when Sync All fails",
  },

  // Bank Account List
  "plaid.bankAccount.linkedOn": {
    message: "متصل‌شده در {date}",
    description:
      "Date when bank was linked - interpolation: {date} for formatted date",
  },
  "plaid.bankAccount.status.active": {
    message: "فعال",
    description: "Status badge for active bank connection",
  },
  "plaid.bankAccount.status.reauthRequired": {
    message: "نیاز به احراز هویت مجدد",
    description: "Status badge when reauthentication is required",
  },
  "plaid.bankAccount.status.disabled": {
    message: "غیرفعال",
    description: "Status badge for disabled bank connection",
  },

  // Institution Detail - Header
  "plaid.institutionDetail.lastSynced": {
    message: "آخرین همگام‌سازی",
    description: "Label for last sync timestamp",
  },
  "plaid.institutionDetail.transactionsCount_one": {
    message: "{count} تراکنش",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.transactionsCount_other": {
    message: "{count} تراکنش",
    description: "Transaction count display - interpolation: {count}",
  },
  "plaid.institutionDetail.syncFailed": {
    message: "ناموفق",
    description: "Label when sync fails",
  },
  "plaid.institutionDetail.reconnecting": {
    message: "در حال اتصال مجدد...",
    description: "Button text while reconnecting",
  },
  "plaid.institutionDetail.reconnectBank": {
    message: "اتصال مجدد بانک",
    description: "Button text to reconnect bank",
  },
  "plaid.institutionDetail.disconnecting": {
    message: "در حال قطع اتصال...",
    description: "Button text while disconnecting",
  },
  "plaid.institutionDetail.disconnect": {
    message: "قطع اتصال",
    description: "Button text to disconnect bank",
  },
  "plaid.institutionDetail.disconnectTitle": {
    message: "قطع اتصال حساب بانکی",
    description: "Alert dialog title for disconnect confirmation",
  },
  "plaid.institutionDetail.disconnectDescription": {
    message:
      "آیا مطمئن هستید که می‌خواهید اتصال {institutionName} را قطع کنید؟ با این کار همه حساب‌های متصل حذف می‌شوند و همگام‌سازی خودکار تراکنش‌ها متوقف می‌شود.",
    description:
      "Alert dialog description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.cancel": {
    message: "لغو",
    description: "Cancel button text",
  },

  // Institution Detail - Toast Messages
  "plaid.institutionDetail.toast.bankDisconnected": {
    message: "اتصال بانک قطع شد",
    description: "Toast title when bank is disconnected",
  },
  "plaid.institutionDetail.toast.bankDisconnectedDescription": {
    message: "اتصال {institutionName} قطع شد.",
    description:
      "Toast description for disconnect - interpolation: {institutionName}",
  },
  "plaid.institutionDetail.toast.error": {
    message: "خطا",
    description: "Generic error toast title",
  },
  "plaid.institutionDetail.toast.disconnectError": {
    message: "قطع اتصال حساب بانکی ناموفق بود.",
    description: "Toast description for disconnect error",
  },

  // Account Mapping
  "plaid.accountMapping.selectAccount": {
    message: "برای پیکربندی نگاشت حساب‌ها، یک حساب بانکی انتخاب کنید",
    description: "Placeholder message when no account is selected",
  },
  "plaid.accountMapping.noAccounts": {
    message: "هیچ حسابی برای این بانک یافت نشد",
    description: "Message when no accounts are available",
  },
  "plaid.accountMapping.manageAccounts": {
    message: "مدیریت حساب‌ها",
    description:
      "Button that opens Plaid Link so the user can add or remove accounts under a bank",
  },
  "plaid.accountMapping.manageAccountsHint": {
    message: "حساب‌هایی را که این بانک به اشتراک می‌گذارد اضافه یا حذف کنید",
    description: "Tooltip explaining what the manage accounts button does",
  },
  "plaid.accountMapping.manageAccountsRequiresReauth": {
    message: "ابتدا این بانک را دوباره متصل کنید",
    description:
      "Tooltip shown when the manage accounts button is disabled because the bank needs reauthentication",
  },
  "plaid.accountMapping.addAccounts": {
    message: "افزودن حساب",
    description:
      "Button shown in the empty state that opens Plaid Link to share accounts",
  },
  "plaid.accountMapping.manageAccountsLoading": {
    message: "در حال به‌روزرسانی حساب‌ها…",
    description: "Loading label while the manage accounts flow is running",
  },
  "plaid.accountMapping.manageAccountsPreparing": {
    message: "در حال آماده‌سازی…",
    description: "Loading label while the Plaid link token is being created",
  },
  "plaid.accountMapping.manageAccountsWaiting": {
    message: "در انتظار بانک شما…",
    description: "Loading label while the user is inside the Plaid Link dialog",
  },
  "plaid.accountMapping.manageAccountsReconciling": {
    message: "در حال اعمال تغییرات…",
    description: "Loading label while the account list is being reconciled",
  },
  "plaid.accountMapping.manageAccountsUpdatedTitle": {
    message: "حساب‌ها به‌روزرسانی شد",
    description: "Toast title after the account list changed",
  },
  "plaid.accountMapping.manageAccountsUpdated": {
    message: "{added} افزوده شد، {removed} حذف شد.",
    description: "Toast body summarising how the account list changed",
  },
  "plaid.accountMapping.manageAccountsNoChangesTitle": {
    message: "تغییری در حساب‌ها نبود",
    description: "Toast title when the account list came back identical",
  },
  "plaid.accountMapping.manageAccountsNoChanges": {
    message:
      "چیزی تغییر نکرد. برخی بانک‌ها فقط از طریق برنامه یا وب‌سایت خودشان امکان تغییر حساب‌های به‌اشتراک‌گذاشته‌شده را می‌دهند.",
    description:
      "Toast body when Plaid completed without offering account selection",
  },
  "plaid.accountMapping.manageAccountsFailedTitle": {
    message: "به‌روزرسانی حساب‌ها ممکن نشد",
    description: "Toast title when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsFailed": {
    message:
      "ممکن است بانک شما تغییر را ذخیره کرده باشد. «مدیریت حساب‌ها» را دوباره باز کنید و تلاش کنید.",
    description: "Toast body when the manage accounts flow failed",
  },
  "plaid.accountMapping.manageAccountsCancelledTitle": {
    message: "تغییرات حساب لغو شد",
    description: "Toast title when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.manageAccountsCancelled": {
    message: "Plaid Link بدون تغییر هیچ حسابی بسته شد.",
    description: "Toast body when the user closed Plaid Link with an error",
  },
  "plaid.accountMapping.title": {
    message: "حساب‌ها",
    description:
      "Section label for the account mapping list within a bank card",
  },
  "plaid.accountMapping.currency": {
    message: "ارز",
    description: "Label for the account's ledger currency selector",
  },
  "plaid.accountMapping.beancountAccount": {
    message: "حساب Beancount",
    description: "Label for beancount account input",
  },
  "plaid.accountMapping.placeholder": {
    message: "Assets:Checking",
    description: "Placeholder for account input",
  },
  "plaid.accountMapping.saving": {
    message: "در حال ذخیره...",
    description: "Button text while saving",
  },
  "plaid.accountMapping.save": {
    message: "ذخیره",
    description: "Save button text",
  },
  "plaid.accountMapping.cancel": {
    message: "لغو",
    description: "Cancel button text",
  },
  "plaid.accountMapping.notMapped": {
    message: "نگاشت نشده",
    description: "Label for unmapped account",
  },
  "plaid.accountMapping.edit": {
    message: "ویرایش",
    description: "Edit button text",
  },
  "plaid.accountMapping.setMapping": {
    message: "تنظیم نگاشت",
    description: "Button text to set mapping for unmapped account",
  },
  "plaid.accountMapping.aiSuggested": {
    message: "پیشنهاد هوش مصنوعی",
    description: "Badge/hint shown next to an AI-prefilled account mapping",
  },
  "plaid.accountMapping.suggestedAccount": {
    message: "پیشنهاد هوش مصنوعی: {account}",
    description:
      "Inline hint showing the AI-suggested account for an unmapped account - interpolation: {account}",
  },
  "plaid.accountMapping.suggesting": {
    message: "در حال دریافت پیشنهادهای هوش مصنوعی...",
    description: "Loading label while AI mapping suggestions are fetched",
  },
  "plaid.accountMapping.acceptAllSuggestions": {
    message: "پذیرش همه پیشنهادها ({count})",
    description:
      "Button text to accept every AI-suggested mapping at once - interpolation: {count}",
  },
  "plaid.accountMapping.accepting": {
    message: "در حال پذیرش...",
    description: "Button text while accepting all suggestions",
  },

  // Account Mapping - Toast Messages
  "plaid.accountMapping.toast.invalidAccount": {
    message: "حساب نامعتبر",
    description: "Toast title for invalid account",
  },
  "plaid.accountMapping.toast.invalidAccountDescription": {
    message: "لطفاً یک نام حساب Beancount معتبر وارد کنید.",
    description: "Toast description for invalid account",
  },
  "plaid.accountMapping.toast.mappingSaved": {
    message: "نگاشت ذخیره شد",
    description: "Toast title for successful mapping save",
  },
  "plaid.accountMapping.toast.mappingSavedDescription": {
    message: "{accountName} به {ledgerAccount} ({currency}) نگاشت شد",
    description:
      "Toast description for mapping save - interpolation: {accountName}, {ledgerAccount}, {currency}",
  },
  "plaid.accountMapping.toast.error": {
    message: "خطا",
    description: "Generic error toast title",
  },
  "plaid.accountMapping.toast.errorDescription": {
    message: "ذخیره نگاشت حساب ناموفق بود.",
    description: "Toast description for save error",
  },
  "plaid.accountMapping.toast.acceptedAll": {
    message: "پیشنهادها پذیرفته شد",
    description: "Toast title after accepting all AI mapping suggestions",
  },
  "plaid.accountMapping.toast.acceptedAllDescription": {
    message: "{count} حساب با استفاده از پیشنهادهای هوش مصنوعی نگاشت شد.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_one": {
    message: "{count} حساب با استفاده از پیشنهادهای هوش مصنوعی نگاشت شد.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - singular form",
  },
  "plaid.accountMapping.toast.acceptedAllDescription_other": {
    message: "{count} حساب با استفاده از پیشنهادهای هوش مصنوعی نگاشت شد.",
    description:
      "Toast description after accepting all AI mapping suggestions - interpolation: {count} - plural form",
  },

  // Account Detail Page

  // Transaction Review Table
  "plaid.transactionReview.noPendingTitle": {
    message: "بدون تراکنش بانکی",
    description:
      "Title shown when there are no unsynced bank transactions awaiting review",
  },
  "plaid.transactionReview.noPendingDescription": {
    message:
      "همه تراکنش‌ها با دفتر کل شما همگام‌سازی شده‌اند یا تراکنش جدیدی وجود ندارد.",
    description: "Description when no pending transactions",
  },
  "plaid.transactionReview.title": {
    message: "تراکنش‌های بانکی",
    description:
      "Card title for the list of unsynced bank transactions awaiting review before submission to the ledger",
  },
  "plaid.transactionReview.description": {
    message: "{count} تراکنش را بررسی و به دفتر کل خود ارسال کنید",
    description:
      "Card description for the transaction review table - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.description_one": {
    message: "{count} تراکنش را بررسی و به دفتر کل خود ارسال کنید",
    description:
      "Card description for the transaction review table - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.description_other": {
    message: "{count} تراکنش را بررسی و به دفتر کل خود ارسال کنید",
    description:
      "Card description for the transaction review table - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.submitting": {
    message: "در حال ارسال...",
    description: "Button text while submitting",
  },
  "plaid.transactionReview.submit": {
    message: "ارسال",
    description: "Submit button text",
  },
  "plaid.transactionReview.searchPlaceholder": {
    message: "جستجو بر اساس فروشنده یا توضیحات...",
    description: "Search input placeholder",
  },
  "plaid.transactionReview.filterByBank": {
    message: "فیلتر بر اساس بانک",
    description:
      "Accessible name for the dropdown that narrows the table to one connected bank",
  },
  "plaid.transactionReview.allBanks": {
    message: "همه بانک‌ها",
    description: "Bank filter option that turns bank filtering off",
  },
  "plaid.transactionReview.filterByAccount": {
    message: "فیلتر بر اساس حساب بانکی",
    description:
      "Accessible name for the dropdown that narrows the table to one bank account (the Plaid account, not the Beancount ledger account)",
  },
  "plaid.transactionReview.allAccounts": {
    message: "همه حساب‌های بانکی",
    description: "Bank account filter option that turns account filtering off",
  },
  "plaid.transactionReview.accountsSelected_one": {
    message: "{count} حساب انتخاب شد",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.accountsSelected_other": {
    message: "{count} حساب انتخاب شد",
    description:
      "Bank account filter trigger when several accounts are picked - interpolation: {count}",
  },
  "plaid.transactionReview.noMatchingTransactions": {
    message: "هیچ تراکنشی با فیلترهای فعلی مطابقت ندارد.",
    description:
      "Shown in place of table rows when the search box or the bank/account filters exclude every transaction",
  },
  "plaid.transactionReview.clearFilters": {
    message: "پاک کردن فیلترها",
    description:
      "Button that resets the search box and the bank and account filters",
  },
  "plaid.transactionReview.hiddenSelectedNotice": {
    message:
      "{count} تراکنش انتخاب‌شده با فیلترهای فعلی پنهان شده‌اند، اما همچنان ارسال یا حذف می‌شوند.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.hiddenSelectedNotice_one": {
    message:
      "{count} تراکنش انتخاب‌شده با فیلترهای فعلی پنهان شده است، اما همچنان ارسال یا حذف می‌شود.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.hiddenSelectedNotice_other": {
    message:
      "{count} تراکنش انتخاب‌شده با فیلترهای فعلی پنهان شده‌اند، اما همچنان ارسال یا حذف می‌شوند.",
    description:
      "Notice shown when selected rows fall outside the active filters - they are still submitted or deleted - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.setForSelected": {
    message: "تنظیم برای انتخاب‌شده‌ها",
    description:
      "Button in the Target account column header that gives every selected transaction the same target account",
  },
  "plaid.transactionReview.setForSelectedNoSelection": {
    message: "ابتدا تراکنش‌ها را انتخاب کنید تا حساب مقصد آن‌ها را تنظیم کنید.",
    description:
      "Reason shown (tooltip and screen-reader text) while the Set for selected button is disabled because no transaction is selected",
  },
  "plaid.transactionReview.bulkTitle": {
    message: "تنظیم حساب مقصد برای {count} تراکنش انتخاب‌شده",
    description:
      "Heading of the Set for selected panel - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkTitle_one": {
    message: "تنظیم حساب مقصد برای {count} تراکنش انتخاب‌شده",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkTitle_other": {
    message: "تنظیم حساب مقصد برای {count} تراکنش انتخاب‌شده",
    description:
      "Heading of the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkHiddenNote": {
    message:
      "{count} مورد از آن‌ها با فیلترهای فعلی پنهان شده‌اند و آن‌ها هم تنظیم می‌شوند.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkHiddenNote_one": {
    message:
      "{count} مورد از آن‌ها با فیلترهای فعلی پنهان شده است و آن هم تنظیم می‌شود.",
    description:
      "Note in the Set for selected panel when a selected row falls outside the active filters - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkHiddenNote_other": {
    message:
      "{count} مورد از آن‌ها با فیلترهای فعلی پنهان شده‌اند و آن‌ها هم تنظیم می‌شوند.",
    description:
      "Note in the Set for selected panel when selected rows fall outside the active filters - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkReplaceExisting": {
    message: "همچنین {count} حساب مقصد از پیش تنظیم‌شده جایگزین شود",
    description:
      "Switch label in the Set for selected panel; off keeps targets already set (AI Fill or hand-picked) - interpolation: {count} is how many selected rows already have a target (base key for pluralization)",
  },
  "plaid.transactionReview.bulkReplaceExisting_one": {
    message: "همچنین {count} حساب مقصد از پیش تنظیم‌شده جایگزین شود",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkReplaceExisting_other": {
    message: "همچنین {count} حساب مقصد از پیش تنظیم‌شده جایگزین شود",
    description:
      "Switch label in the Set for selected panel - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkWillSet": {
    message: "{count} تراکنش به این حساب اختصاص می‌یابد.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.bulkWillSet_one": {
    message: "{count} تراکنش به این حساب اختصاص می‌یابد.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.bulkWillSet_other": {
    message: "{count} تراکنش به این حساب اختصاص می‌یابد.",
    description:
      "Summary in the Set for selected panel of how many rows Apply will change - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.bulkApply": {
    message: "اعمال",
    description:
      "Button in the Set for selected panel that gives the selected transactions the chosen target account",
  },
  "plaid.transactionReview.toast.targetAccountSet": {
    message: "حساب مقصد تنظیم شد",
    description:
      "Toast title after the Set for selected panel has applied an account",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription": {
    message: "{count} تراکنش اکنون به {account} می‌رود.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_one": {
    message: "{count} تراکنش اکنون به {account} می‌رود.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - singular form",
  },
  "plaid.transactionReview.toast.targetAccountSetDescription_other": {
    message: "{count} تراکنش اکنون به {account} می‌رود.",
    description:
      "Toast description after Set for selected - interpolation: {count}, {account} - plural form",
  },
  "plaid.transactionReview.selectFilePlaceholder": {
    message: "انتخاب کنید در کدام فایل وارد شود",
    description: "Placeholder for the target ledger file picker",
  },
  "plaid.transactionReview.missingAccountsAlert": {
    message: "{count} تراکنش انتخاب‌شده پیش از ارسال به حساب مقصد نیاز دارند.",
    description:
      "Alert message for missing target accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.missingAccountsAlert_one": {
    message: "{count} تراکنش انتخاب‌شده پیش از ارسال به حساب مقصد نیاز دارد.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.missingAccountsAlert_other": {
    message: "{count} تراکنش انتخاب‌شده پیش از ارسال به حساب مقصد نیاز دارند.",
    description:
      "Alert message for missing target accounts - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.selectAll": {
    message: "انتخاب همه",
    description: "Checkbox label to select all transactions",
  },
  "plaid.transactionReview.date": {
    message: "تاریخ",
    description: "Table header for date column",
  },
  "plaid.transactionReview.source": {
    message: "بانک",
    description: "Table header for the source institution/account column",
  },
  "plaid.transactionReview.sourceAccount": {
    message: "حساب مبدأ",
    description:
      "Table header for the editable Beancount source-account column, defaults from the account mapping",
  },
  "plaid.transactionReview.merchant": {
    message: "فروشنده",
    description: "Table header for merchant column",
  },
  "plaid.transactionReview.descriptionColumn": {
    message: "توضیحات",
    description: "Table header for description column",
  },
  "plaid.transactionReview.amount": {
    message: "مبلغ",
    description: "Table header for amount column",
  },
  "plaid.transactionReview.targetAccount": {
    message: "حساب مقصد",
    description: "Table header for target account column",
  },
  "plaid.transactionReview.aiProcessing": {
    message: "هوش مصنوعی...",
    description: "Button text while AI is processing",
  },
  "plaid.transactionReview.aiFill": {
    message: "تکمیل با هوش مصنوعی",
    description: "Button text for AI categorization",
  },
  "plaid.transactionReview.selectAccountPlaceholder": {
    message: "انتخاب حساب...",
    description: "Placeholder for account selection dropdown",
  },

  // Transaction Review - Toast Messages
  "plaid.transactionReview.toast.categorizationComplete": {
    message: "دسته‌بندی کامل شد",
    description: "Toast title when AI categorization completes",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_one": {
    message: "هوش مصنوعی برای {count} تراکنش حساب پیشنهاد داد.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationCompleteDescription_other": {
    message: "هوش مصنوعی برای {count} تراکنش حساب پیشنهاد داد.",
    description:
      "Toast description for categorization complete - interpolation: {count}",
  },
  "plaid.transactionReview.toast.categorizationFailed": {
    message: "دسته‌بندی ناموفق بود",
    description: "Toast title when AI categorization fails",
  },
  "plaid.transactionReview.toast.categorizationFailedDescription": {
    message: "دسته‌بندی تراکنش‌ها ناموفق بود. لطفاً دوباره تلاش کنید.",
    description: "Toast description for categorization failure",
  },
  "plaid.transactionReview.toast.noTransactionsSelected": {
    message: "هیچ تراکنشی انتخاب نشده است",
    description: "Toast title when no transactions are selected",
  },
  "plaid.transactionReview.toast.noTransactionsSelectedDescription": {
    message: "لطفاً دست‌کم یک تراکنش را برای ارسال انتخاب کنید.",
    description: "Toast description for no transactions selected",
  },
  "plaid.transactionReview.toast.missingTargetAccounts": {
    message: "حساب‌های مقصد مشخص نشده‌اند",
    description: "Toast title for missing target accounts",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription": {
    message: "{count} تراکنش انتخاب‌شده به حساب مقصد نیاز دارند.",
    description:
      "Toast description for missing accounts - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_one": {
    message: "{count} تراکنش انتخاب‌شده به حساب مقصد نیاز دارد.",
    description:
      "Toast description for missing accounts - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.missingTargetAccountsDescription_other": {
    message: "{count} تراکنش انتخاب‌شده به حساب مقصد نیاز دارند.",
    description:
      "Toast description for missing accounts - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.transactionsSubmitted": {
    message: "تراکنش‌ها ارسال شدند",
    description: "Toast title when transactions are submitted",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_one": {
    message: "{count} تراکنش به دفتر کل شما اضافه شد.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.transactionsSubmittedDescription_other": {
    message: "{count} تراکنش به دفتر کل شما اضافه شد.",
    description:
      "Toast description for submitted transactions - interpolation: {count}",
  },
  "plaid.transactionReview.toast.submissionFailed": {
    message: "ارسال ناموفق بود",
    description: "Toast title when submission fails",
  },
  "plaid.transactionReview.toast.submissionFailedDescription": {
    message: "ارسال تراکنش‌ها ناموفق بود. لطفاً دوباره تلاش کنید.",
    description: "Toast description for submission failure",
  },
  "plaid.transactionReview.delete": {
    message: "حذف",
    description: "Delete button text",
  },
  "plaid.transactionReview.deleting": {
    message: "در حال حذف...",
    description: "Button text while deleting",
  },
  "plaid.transactionReview.deleteConfirmTitle": {
    message: "تراکنش‌ها حذف شوند؟",
    description: "Confirmation dialog title for bulk-deleting transactions",
  },
  "plaid.transactionReview.deleteConfirmDescription": {
    message:
      "با این کار {count} تراکنش انتخاب‌شده برای همیشه از این فهرست حذف می‌شود. این عملیات قابل بازگشت نیست.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.deleteConfirmDescription_one": {
    message:
      "با این کار {count} تراکنش انتخاب‌شده برای همیشه از این فهرست حذف می‌شود. این عملیات قابل بازگشت نیست.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.deleteConfirmDescription_other": {
    message:
      "با این کار {count} تراکنش انتخاب‌شده برای همیشه از این فهرست حذف می‌شود. این عملیات قابل بازگشت نیست.",
    description:
      "Confirmation dialog description for bulk-deleting transactions - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.transactionsDeleted": {
    message: "تراکنش‌ها حذف شدند",
    description: "Toast title when transactions are deleted",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription": {
    message: "{count} تراکنش از این فهرست حذف شد.",
    description:
      "Toast description for deleted transactions - interpolation: {count} (base key for pluralization)",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_one": {
    message: "{count} تراکنش از این فهرست حذف شد.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - singular form",
  },
  "plaid.transactionReview.toast.transactionsDeletedDescription_other": {
    message: "{count} تراکنش از این فهرست حذف شد.",
    description:
      "Toast description for deleted transactions - interpolation: {count} - plural form",
  },
  "plaid.transactionReview.toast.deletionFailed": {
    message: "حذف ناموفق بود",
    description: "Toast title when deletion fails",
  },
  "plaid.transactionReview.toast.deletionFailedDescription": {
    message: "تراکنش‌ها حذف نشدند. دوباره تلاش کنید.",
    description: "Toast description for deletion failure",
  },
  "plaid.institutionNotFound": {
    message: "موسسه یافت نشد",
    description: "Empty state when a Plaid institution is unavailable",
  },
  "plaid.thisInstitution": {
    message: "این موسسه",
    description: "Fallback name for a Plaid institution",
  },
  "plaid.transactionReview.selectTransaction": {
    message: "تراکنش {transaction} را انتخاب کنید",
    description: "Accessible label for selecting a Plaid transaction",
  },
  "plaid.connection.cancelled": {
    message: "اتصال لغو شد",
    description: "Toast title when Plaid connection is cancelled",
  },
  "plaid.connection.linkClosed": {
    message: "لینک پلید بسته شد.",
    description: "Toast description when Plaid Link closes",
  },
  "plaid.connection.alreadyExists": {
    message: "اتصال از قبل وجود دارد",
    description: "Toast title for a duplicate Plaid connection",
  },
  "plaid.connection.alreadyExistsDescription": {
    message:
      "شما از قبل یک اتصال فعال به {institution} دارید. لطفاً ابتدا پیوند موجود را لغو کنید.",
    description: "Toast description for a duplicate Plaid connection",
  },
  "plaid.connection.failed": {
    message: "اتصال انجام نشد",
    description: "Toast title when Plaid connection fails",
  },
  "plaid.connection.connecting": {
    message: "در حال اتصال…",
    description: "Status while connecting a bank",
  },
  "plaid.connection.preparing": {
    message: "آماده سازی…",
    description: "Status while preparing Plaid Link",
  },
  "plaid.connection.waitingForAuthorization": {
    message: "در انتظار مجوز…",
    description: "Status while waiting for Plaid authorization",
  },
  "plaid.connection.finalizing": {
    message: "در حال نهایی شدن…",
    description: "Status while finalizing a Plaid connection",
  },
  "plaid.reauth.reconnected": {
    message: "بانک دوباره وصل شد",
    description: "Toast title after reconnecting a bank",
  },
  "plaid.reauth.reconnectedDescription": {
    message: "حساب بانکی شما با موفقیت دوباره وصل شد.",
    description: "Toast description after reconnecting a bank",
  },
  "plaid.reauth.statusUpdateFailed": {
    message: "به روز رسانی وضعیت ناموفق بود",
    description: "Toast title when a reconnected bank status cannot update",
  },
  "plaid.reauth.statusUpdateFailedDescription": {
    message:
      "اتصال مجدد با موفقیت انجام شد، اما وضعیت به‌روزرسانی نشد. لطفا صفحه را رفرش کنید",
    description:
      "Toast description when status update fails after reconnection",
  },
  "plaid.reauth.cancelled": {
    message: "اتصال مجدد لغو شد",
    description: "Toast title when bank reconnection is cancelled",
  },
  "plaid.reauth.linkClosed": {
    message: "پیوند Plaid بدون اتصال مجدد بسته شد.",
    description: "Toast description when Plaid Link closes during reconnection",
  },
  "plaid.reauth.failed": {
    message: "اتصال مجدد انجام نشد",
    description: "Toast title when bank reconnection fails",
  },
  "plaid.reauth.reconnecting": {
    message: "در حال اتصال مجدد…",
    description: "Status while reconnecting a bank",
  },
  "plaid.reauth.updatingStatus": {
    message: "در حال به روز رسانی وضعیت…",
    description: "Status while updating a reconnected bank",
  },
};

export default faPlaid;
