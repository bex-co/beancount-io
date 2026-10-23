export interface TranslationEntry {
  message: string;
  description: string;
}

const faDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "ایجاد دفتر",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "ایجاد دفتر جدید",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message:
      "یک دفتر Beancount جدید ایجاد کنید تا مدیریت امور مالی خود را آغاز کنید.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "داشبورد",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.goToDashboard": {
    message: "رفتن به داشبورد",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
  },
  "page.dashboard.deleteLedger": {
    message: "حذف دفتر",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'آیا مطمئن هستید که می‌خواهید "{name}" را حذف کنید؟ این عملیات قابل بازگشت نیست.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "در حال حذف...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "توضیحات (اختیاری)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "ویرایش دفتر",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "ویرایش تنظیمات دفتر",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "توضیحات را وارد کنید",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "نام دفتر را وارد کنید",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "بارگذاری دفاتر ناموفق بود",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.feedError": {
    message: "بارگذاری خوراک ناموفق بود",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "دفتر با موفقیت ایجاد شد",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "دفتر با موفقیت حذف شد",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "شما به محدودیت دفتر کل خود رسیده‌اید. برای ایجاد دفاتر کل بیشتر ارتقا دهید.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "نام دفتر",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerSettingsFor": {
    message: "تنظیمات {ledger}",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "دفتر با موفقیت به‌روزرسانی شد",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "در حال بارگذاری دفاتر...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "مدیریت دفاتر Beancount خود",
    description: "Description of ledger management",
  },
  "page.dashboard.nameInvalid": {
    message:
      "دست‌کم یک حرف لاتین (A–Z) یا یک رقم به کار ببرید: نام به نشانی وب دفتر تبدیل می‌شود.",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "نام باید کمتر از ۱۰۰ کاراکتر باشد",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "نام الزامی است",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "دفتر شخصی",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message: "خریدی ثبت کنید و اثرش بر پول باقی‌مانده را ببینید.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "دفتر فریلنسری",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message:
      "درآمد مشتری ثبت کنید یا ببینید مشتری پرداخت‌نکرده چقدر بدهکار است.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "دفتر کسب‌وکار",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message: "موضع افتتاحیه بسازید و تأمین مالی را از درآمد جدا کنید.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "دفتر پورتفولیو",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message: "خریدی ثبت کنید و واحدها، سوابق تحصیل و حرکت پول را بررسی کنید.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "دفتر اجاره",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message: "رسیدها را ثبت کنید و اجاره را از ودیعه قابل استرداد جدا کنید.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "دفتر هزینه‌های مشترک",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "پیش‌پرداختی ثبت کنید و ببینید چه کسی به چه کسی بدهکار است.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "دفتر جامعه",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "مشارکت‌ها، هزینه‌های پروژه و وجوه باقی‌مانده را توضیح دهید.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "دفتر خالی",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message: "ساختار دلخواه بیفزایید بدون حذف دسته‌های ناخواسته.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "مبلغی مانند 100 یا -30.50 وارد کنید",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "ارز عملیاتی",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "دفاتر از تاریخ",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "حساب افتتاحیه",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "موجودی افتتاحیه (اختیاری)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "تصمیم‌گیری در آینده",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "بازبینی",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message: "دقیقاً همین ایجاد خواهد شد. برای تغییر به عقب برگردید.",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "حساب‌ها",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "گام {step} از {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.noLedgersFound": {
    message: "دفتری یافت نشد",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message:
      "اولین دفتر خود را ایجاد کنید تا پیگیری امور مالی خود را آغاز کنید.",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "خصوصی",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "فقط شما و همکاران می‌توانند دسترسی داشته باشند",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "عمومی",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message: "هر کسی با داشتن لینک می‌تواند داده‌های مالی شما را مشاهده کند",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "نام مخزن",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "تلاش مجدد",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "جستجوی دفاتر...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "انتخاب دفتر",
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — تغییر دفتر",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
  },
  "page.dashboard.showMore": {
    message: "نمایش بیشتر",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "جزئیات دفتر خود را به‌روزرسانی کنید.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "دفاتر شما",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "برو به حساب {owner}",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.activity": {
    message: "فعالیت",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "تغییرات دفترهای شما اینجا نمایش داده می‌شود.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "تغییرات در همه دفترهایی که می‌بینید",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message:
      "فعالیت به‌روز نشد. فعالیتی که پیش‌تر بارگیری شده بود نمایش داده می‌شود.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default faDashboardPage;
