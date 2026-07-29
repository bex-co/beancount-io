export interface TranslationEntry {
  message: string;
  description: string;
}

const faCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "حساب",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "تراکنش‌ها",
    description: "Plural form of transaction",
  },
  "common.adminPermissionRequired": {
    message: "Admin permission is required to access this page.",
    description: "Specific message for admin-only pages",
  },
  "common.anErrorOccurred": {
    message: "خطایی رخ داد",
    description: "Generic error message",
  },
  "common.back": {
    message: "بازگشت",
    description: "Button label to go back to previous page",
  },
  "common.backToLedger": {
    message: "Back to Ledger",
    description: "Button text to go back to ledger overview",
  },
  "common.beancountDashboard": {
    message: "داشبورد Beancount",
    description: "Main application title",
  },
  "common.beancountLogo": {
    message: "لوگوی Beancount",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "لغو",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "پاک کردن",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "بستن",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "محدودیت همکاران",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "محدودیت همکاران به پایان رسید",
    description: "Title when collaborator limit is reached",
  },
  "common.collaboratorsLimitReachedMessage": {
    message:
      "شما به محدودیت {max} همکار رسیده‌اید. برای افزودن همکاران بیشتر به دفتر خود، به Premium ارتقا دهید.",
    description: "Message when collaborator limit is reached",
  },
  "common.collaboratorsUsed": {
    message: "{used} از {max} همکار",
    description: "Shows current collaborator usage",
  },
  "common.confirm": {
    message: "تأیید",
    description: "Button label to confirm action",
  },
  "common.copied": {
    message: "کپی شد",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "کپی",
    description: "Button label to copy content",
  },
  "common.dashboardTagline": {
    message: "حسابداری متنی ساده. قدرتمند، دقیق، قابل حسابرسی.",
    description: "Tagline describing the application",
  },
  "common.delete": {
    message: "حذف",
    description: "Button label to delete item",
  },
  "common.directives": {
    message: "directives",
    description:
      "Unit label for beancount directive count (e.g. '842 / 1000 directives')",
  },
  "common.directivesLimitApproaching": {
    message: "Approaching your free plan limit",
    description:
      "Secondary text shown when a ledger's directive usage is between 90% and 100% of the free-tier limit",
  },
  "common.directivesLimitReached": {
    message: "Free plan limit reached",
    description:
      "Secondary text shown when a ledger's directive usage is at or over the free-tier limit",
  },
  "common.done": {
    message: "تمام",
    description: "Button label indicating completion",
  },
  "common.edit": {
    message: "ویرایش",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "با خطای غیرمنتظره‌ای مواجه شدیم. لطفاً دوباره تلاش کنید یا به صفحه قبلی برگردید.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "جزئیات خطا",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "خطایی رخ داد",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "مشکلی پیش آمد",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "بارگذاری داده‌ها ناموفق بود",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadDataDescription": {
    message:
      "امکان بازیابی اطلاعات دفتر شما وجود نداشت. لطفاً اتصال خود را بررسی کرده و دوباره تلاش کنید.",
    description: "Error description when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "بارگذاری دفتر ناموفق بود",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "بازگشت",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "رفتن به خانه",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "رفتن به صفحه بعد",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "رفتن به صفحه قبل",
    description: "Aria label for previous page button",
  },
  "common.home": {
    message: "خانه",
    description: "Navigation label for home page",
  },
  "common.insufficientPermissions": {
    message: "Insufficient Permissions",
    description: "Error title when user lacks required permissions",
  },
  "common.insufficientPermissionsDescription": {
    message:
      "You don't have the necessary permissions to access this page. Please contact the ledger administrator for access.",
    description: "Error description when user lacks required permissions",
  },
  "common.import": {
    message: "واردکردن",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "افزودن ورودی",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "تراکنش، موجودی یا یادداشت",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "واردات هوشمند",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "صورت‌حساب بانکی، CSV، PDF یا اسکن",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "اتصال بانک",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "همگام‌سازی خودکار تراکنش‌ها",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "آپلود رسید",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "اسکن رسید با هوش مصنوعی",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "پارامترهای URL نامعتبر",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "پارامترهای URL ارائه شده معتبر نیستند. لطفاً لینک را بررسی کرده و دوباره تلاش کنید.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "آخرین به‌روزرسانی",
    description: "Table column header for last update time",
  },
  "common.ledger": {
    message: "دفتر کل",
    description: "Navigation label for ledger page",
  },
  "common.ledgerSettings": {
    message: "تنظیمات دفتر",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "محدودیت دفتر",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "محدودیت دفتر به پایان رسید",
    description: "Title when ledger limit is reached",
  },
  "common.ledgersUsed": {
    message: "{used} از {max} دفتر استفاده شده",
    description: "Shows current ledger usage",
  },
  "common.loading": {
    message: "در حال بارگذاری...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "در حال بارگذاری داده‌ها...",
    description: "Generic loading state message",
  },
  "common.mine": {
    message: "من",
    description: "Navigation label for user profile section",
  },
  "common.morePages": {
    message: "صفحات بیشتر",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "نام",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "نزدیک به محدودیت",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "اتصال شبکه ناموفق بود",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "امکان اتصال به سرور وجود ندارد. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "بعدی",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "بعدی",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "داده‌ای یافت نشد.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "نتیجه‌ای یافت نشد.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "سایر",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "مالک",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "صفحه یافت نشد",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message:
      "صفحه‌ای که به دنبال آن هستید وجود ندارد یا به مکان دیگری منتقل شده است.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "صفحه‌بندی",
    description: "Aria label for pagination navigation",
  },
  "common.pleaseRetryLater": {
    message: "لطفاً بعداً دوباره تلاش کنید",
    description: "Suggestion message after error",
  },
  "common.premiumBenefit.collaborators": {
    message: "افزودن تا 5 همکار به هر دفتر",
    description: "Premium benefit for more collaborators",
  },
  "common.premiumBenefit.ledgers": {
    message: "ایجاد تا 5 دفتر به جای 1",
    description: "Premium benefit for more ledgers",
  },
  "common.premiumBenefit.moreCollaborators": {
    message: "دعوت تا 5 همکار به جای 2",
    description: "Premium benefit for more collaborators",
  },
  "common.premiumBenefit.unlimitedFeatures": {
    message: "دسترسی به ویژگی‌های پیشرفته و پشتیبانی اولویت‌دار",
    description: "Premium benefit for unlimited features",
  },
  "common.premiumBenefits": {
    message: "مزایای Premium",
    description: "Section title for list of premium benefits",
  },
  "common.previous": {
    message: "قبلی",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "صفحات مرتبط",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "ذخیره",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "در حال ذخیره...",
    description: "Saving state message",
  },
  "common.search": {
    message: "جستجو",
    description: "Button or input label for search functionality",
  },
  "common.seeAlso": {
    message: "صفحات مرتبط",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "انتخاب نما",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "انتخاب تاریخ",
    description: "Screen reader label for date picker button",
  },
  "common.setting": {
    message: "تنظیم",
    description: "Singular form of settings",
  },
  "common.settings": {
    message: "تنظیمات",
    description: "Navigation label for settings page",
  },
  "common.share": {
    message: "اشتراک‌گذاری",
    description: "Button label to share content",
  },
  "common.sidebar": {
    message: "نوار کناری",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "نوار کناری موبایل را نمایش می‌دهد.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "ستاره‌ها",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "وضعیت",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "تغییر وضعیت نوار کناری",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "تلاش مجدد",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message: "خطای غیرمنتظره‌ای در بارگذاری دفتر رخ داد.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "نامشخص",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "به‌روزرسانی...",
    description: "Updating state message",
  },
  "common.upgradeNow": {
    message: "اکنون ارتقا دهید",
    description: "Button text to upgrade immediately",
  },
  "common.upgradeToPremium": {
    message: "ارتقا به Premium",
    description: "Title for upgrade prompt dialog",
  },
  "common.upgradeToPro": {
    message: "ارتقا به Pro",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "ارتقا برای باز کردن",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "user@example.com",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "کاربر",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "دانلود",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "اقدامات بیشتر",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "اطلاعات بیشتر",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "نمای جزئیات حساب برای {ledgerName}. تجزیه و تحلیل تراکنش‌ها، موجودی‌ها و سابقه حساب.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "با استفاده از هوش مصنوعی در مورد داده‌های مالی {ledgerName} سوال بپرسید. تراکنش‌ها را تحلیل کنید، موجودی حساب‌ها را بررسی کنید، روندها را درک کنید و بینش‌های حسابداری فوری دریافت کنید.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "نمای ترازنامه برای {ledgerName}. تجزیه و تحلیل دارایی‌ها، بدهی‌ها و حقوق صاحبان سهام در هر نقطه زمانی.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.collaborators": {
    message:
      "مدیریت همکاران برای {ledgerName}. دعوت کاربران و کنترل مجوزهای دسترسی.",
    description: "Description for collaborators page",
  },
  "common.pageDescription.commodities": {
    message:
      "مشاهده و مدیریت کالاها (ارزها، سهام و دارایی‌ها) استفاده شده در {ledgerName}. پیگیری نرخ ارز و تاریخچه قیمت.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "ایجاد یک فایل جدید در {ledgerName}. اضافه کردن فایل‌های دفتر کل Beancount یا اسناد به مخزن.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "مشاهده اسناد پیوست شده به تراکنش‌ها در {ledgerName}. بررسی رسیدها، فاکتورها و مستندات پشتیبان.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "نمای خطاهای تجزیه و اعتبارسنجی در {ledgerName}. رفع مشکلات برای اطمینان از گزارش‌های مالی دقیق.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "مشاهده رویدادها و نقاط عطف مهم در {ledgerName}. پیگیری باز و بسته شدن حساب‌ها و رویدادهای چرخه حیات.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "مشاهده و ویرایش فایل‌های منبع Beancount در {ledgerName}. مدیریت نمودار حساب‌ها و تاریخچه تراکنش.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "تجزیه و تحلیل دارایی‌های فعلی و پرتفوی در {ledgerName}. مشاهده تخصیص دارایی، ارزش‌های بازار و سودهای تحقق نیافته.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "افزودن تراکنش‌ها به {ledgerName} از صورت‌حساب‌های بانکی، صفحات گسترده یا رسیدها. پشتیبانی از CSV، PDF، OFX و تصاویر تا 10 مگابایت.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "نمای درآمد و هزینه برای {ledgerName}. پیگیری درآمد، هزینه و سودآوری در طول زمان.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "مشاهده و فیلتر تمام تراکنش‌ها در {ledgerName}. جستجو بر اساس تاریخ، حساب، توضیحات یا دریافت‌کننده.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "داشبورد مالی برای {ledgerName}. بررسی موجودی حساب‌ها، روندهای خالص دارایی و خلاصه درآمد/هزینه.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "اجرای پرس و جوهای BQL (زبان پرس و جوی Beancount) روی {ledgerName}. فیلتر و تجزیه و تحلیل داده‌های مالی با نحو شبیه SQL.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "پیکربندی تنظیمات برای {ledgerName}. مدیریت ارزهای عملیاتی، همکاران و تنظیمات حریم خصوصی.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "نمای آمار دفتر کل برای {ledgerName}. تجزیه و تحلیل تعداد تراکنش‌ها، استفاده از حساب و معیارهای کیفیت داده.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "نمای تراز آزمایشی برای {ledgerName}. تأیید بدهکار و بستانکار در همه حساب‌ها.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "آپلود فایل‌ها به {ledgerName}. وارد کردن فایل‌ها یا اسناد موجود Beancount.",
    description: "Description for upload files page",
  },
  "common.pageDescription.versionHistory": {
    message:
      "نمای تاریخچه کامیت‌ها برای {ledgerName}. پیگیری تغییرات در فایل‌های دفتر کل در طول زمان.",
    description: "Description for version history page",
  },
  "common.postings": {
    message: "ردیف‌های حسابداری",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.account": {
    message: "حساب",
    description: "Link label for account page",
  },
  "common.relatedLinks.balanceSheet": {
    message: "ترازنامه",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.collaborators": {
    message: "همکاران",
    description: "Link label for collaborators page",
  },
  "common.relatedLinks.commodities": {
    message: "کالاها",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "ایجاد فایل",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "اسناد",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "خطاها",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "رویدادها",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "فایل‌ها",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "دارایی‌ها",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "وارد کردن",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "صورت سود و زیان",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "دفتر روزنامه",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "نمای کلی",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "پرس و جو",
    description: "Link label for query page",
  },
  "common.relatedLinks.settings": {
    message: "تنظیمات",
    description: "Link label for settings page",
  },
  "common.relatedLinks.statistics": {
    message: "آمار",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "تراز آزمایشی",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "بارگذاری فایل‌ها",
    description: "Link label for upload files page",
  },
  "common.relatedLinks.versionHistory": {
    message: "تاریخچه نسخه",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "نتایج",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "ردیف‌ها",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "موفقیت",
    description: "Auto-generated from code usage",
  },
  "common.amount": {
    message: "مبلغ",
    description: "Label for amount column in tables",
  },
  "common.assets": {
    message: "دارایی‌ها",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "به بهای تمام شده",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "به ارزش بازار",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "گزارش‌ها",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "پیشرفته",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.needHelp": {
    message: "به کمک نیاز دارید؟",
    description: "Navigation label for the external help link",
  },
  "common.helpAndSupport": {
    message: "راهنما و پشتیبانی",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "مرکز راهنما",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "راهنماها و مستندات را مرور کنید",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "پشتیبانی انجمن",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "از انجمن در تلگرام بپرسید",
    description: "Description for the community support menu item",
  },
  "common.balanceSheet": {
    message: "ترازنامه",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "پاک کردن همه",
    description: "Button text to clear all filters",
  },
  "common.commodities": {
    message: "کالاها",
    description: "Label for commodities column in tables",
  },
  "component.conversionSelect.convertedTo": {
    message: "تبدیل شده به",
    description: "Prefix for currency conversion option",
  },
  "common.currency": {
    message: "ارز",
    description: "Label for currency column in tables",
  },
  "component.intervalSelect.daily": {
    message: "روزانه",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "حقوق صاحبان سهام",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "خطا در بارگذاری داده‌ها",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "هزینه‌ها",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "بارگذاری گزینه‌های فیلتر ناموفق بود",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "فیلتر بر اساس برچسب، دریافت‌کننده، ...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "تجزیه تفصیلی {ledgerName} {sectionName} با مقادیر USD و سایر کالاها",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "فهرست {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "سلسله مراتب {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "نمایش بصری ترکیب {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "درآمد",
    description: "Income category in accounting",
  },
  "common.incomeStatement": {
    message: "صورت سود و زیان",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "بدهی‌ها",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "سود خالص",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "ارزش خالص",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "حسابی یافت نشد",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "جستجوی فایل‌ها...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "فایلی یافت نشد",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "داده‌ای موجود نیست",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "داده‌ای برای فیلترهای انتخابی وجود ندارد",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "موردی یافت نشد",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "خلاصه",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "لطفاً بعداً دوباره تلاش کنید",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "فصلی",
    description: "Quarterly interval option",
  },
  "common.savings": {
    message: "پس‌انداز",
    description: "Label for savings node in cash flow diagram",
  },
  "component.accountCombobox.placeholder": {
    message: "جستجوی حساب‌ها...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "انتخاب تبدیل",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "انتخاب دوره زمانی",
    description: "Placeholder for interval select dropdown",
  },
  "common.summary": {
    message: "خلاصه",
    description: "Label for summary section or table",
  },
  "component.searchControls.time": {
    message: "زمان",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "تراز آزمایشی",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "برای جستجو تایپ کنید...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "واحدها",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "سالانه",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "حساب",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "خطا",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "نشست منقضی شد",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message: "نشست ورود شما منقضی شده است. برای ادامه دوباره وارد شوید.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "برای ادامه وارد شوید.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "شما اجازه انجام این عملیات را ندارید.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "منبع درخواستی یافت نشد.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message:
      "برخی از اطلاعات واردشده نامعتبر است. لطفاً بررسی کنید و دوباره تلاش کنید.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message:
      "اعتبارسنجی ناموفق بود. لطفاً اطلاعات را بررسی کنید و دوباره تلاش کنید.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "این تغییر با وضعیت فعلی در تضاد است. صفحه را تازه‌سازی کنید و دوباره تلاش کنید.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "درخواست‌های بیش از حد. لطفاً کمی صبر کنید و دوباره تلاش کنید.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message: "مشکلی از سمت ما پیش آمد. لطفاً بعداً دوباره تلاش کنید.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message: "سرویس موقتاً در دسترس نیست. لطفاً کمی بعد دوباره تلاش کنید.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message: "به سقف طرح خود رسیده‌اید. برای ادامه طرح خود را ارتقا دهید.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "این عملیات مجاز نیست.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "این قابلیت به اشتراک پرمیوم نیاز دارد.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "مشکل در اتصال. اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "مشکلی پیش آمد. دوباره تلاش کنید.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "مشکلی پیش آمد",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message: "نمایش این بخش ممکن نشد. بقیه صفحه باید همچنان کار کند.",
    description: "Body of the error boundary fallback panel",
  },
};

export default faCommon;
