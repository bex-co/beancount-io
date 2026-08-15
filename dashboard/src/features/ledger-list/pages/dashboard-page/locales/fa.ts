export interface TranslationEntry {
  message: string;
  description: string;
}

const faDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.blogFeed": {
    message: "آخرین به‌روزرسانی‌ها",
    description: "Title for blog feed section on dashboard",
  },
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
  "page.dashboard.failedToLoadLedgersDescription": {
    message:
      "امکان بازیابی دفاتر شما وجود نداشت. لطفاً اتصال خود را بررسی کرده و دوباره تلاش کنید.",
    description: "Detailed error description for ledger loading failure",
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
  "page.dashboard.manageLedgersDescription": {
    message:
      "دفاتر Beancount خود را مدیریت کنید. برای مشاهده جزئیات هر دفتر، روی آن کلیک کنید.",
    description: "Detailed description with click instruction",
  },
  "page.dashboard.nameInvalid": {
    message: "نام باید حداقل یک حرف یا عدد داشته باشد",
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
  "page.dashboard.noFeedItems": {
    message: "هیچ موردی در دسترس نیست",
    description: "Empty state message when no feed items exist",
  },
  "page.dashboard.noLedgersFound": {
    message: "دفتری یافت نشد",
    description: "Message when user has no ledgers",
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
    description: "Aria label for ledger switcher button",
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
};

export default faDashboardPage;
