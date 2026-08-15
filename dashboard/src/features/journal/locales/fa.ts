export interface TranslationEntry {
  message: string;
  description: string;
}

const faJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "حساب",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "حساب (مثلاً دارایی‌ها:بانک:جاری)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "حساب الزامی است",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "حساب‌ها",
    description: "Plural form of account",
  },
  "journal.addNewJournalEntry": {
    message: "افزودن ثبت روزنامه جدید",
    description: "Aria label for add new journal entry button",
  },
  "journal.amountMustBeNumber": {
    message: "مبلغ باید یک عدد معتبر باشد",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "مبلغ (مثلاً ۱۰۰.۰۰)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "مبلغ الزامی است",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastTwoPostings": {
    message: "حداقل دو ثبت مورد نیاز است",
    description: "Validation error when less than two postings exist",
  },
  "journal.balance": {
    message: "مانده",
    description: "Balance entry type",
  },
  "journal.balanceHeader": {
    message: "مانده",
    description: "Table header for balance column",
  },
  "journal.balancesAfterEntry": {
    message: "مانده‌ها پس از ثبت",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "مانده‌ها قبل از ثبت",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "B",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "ثبت‌های بودجه",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "تغییر",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "تراکنش‌های تسویه شده",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "بستن",
    description: "Close account entry type filter",
  },
  "journal.createNewJournalEntry": {
    message: "ایجاد یک ثبت روزنامه جدید برای این دفتر",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "ایجاد ثبت حساب",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "ایجاد ثبت تراز",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "ایجاد ثبت یادداشت",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "ایجاد ثبت تراکنش",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "ارز (مثلاً USD)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "ارز الزامی است",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "سفارشی",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "تاریخ",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "D",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "اسناد کشف شده",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "سند",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message: "دانلود ثبت‌های فعلی فیلتر شده به عنوان فایل Beancount",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "متن ثبت",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "ثبت با موفقیت ایجاد شد",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "موقعیت:",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "خطا در بارگذاری ثبت‌های روزنامه",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "صدور",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "صدور روزنامه",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "در حال صدور...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "ایجاد ثبت مانده ناموفق بود",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "ایجاد ثبت یادداشت ناموفق بود",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "ایجاد تراکنش ناموفق بود",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "صدور روزنامه ناموفق بود",
    description: "Error message when journal export fails",
  },
  "journal.journal": {
    message: "روزنامه",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "روزنامه با موفقیت صادر شد",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "L",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "اسناد پیوند شده",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "در حال بارگذاری متن ثبت...",
    description: "Loading message while fetching entry context",
  },
  "journal.metadata": {
    message: "فراداده",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "شرح",
    description: "Placeholder for narration field",
  },
  "journal.newEntry": {
    message: "ثبت جدید",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "ارزی یافت نشد",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "هیچ ثبت روزنامه‌ای برای فیلترهای فعلی یافت نشد.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noNarrationsFound": {
    message: "شرحی یافت نشد",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "دریافت‌کننده‌ای یافت نشد",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "یادداشت",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "محتوای یادداشت",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "محتوای یادداشت الزامی است",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "باز کردن",
    description: "Open account entry type filter",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "سایر تراکنش‌ها",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "تراز",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "دریافت‌کننده/شرح",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "دریافت‌کننده",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "تراکنش‌های در انتظار",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "پست‌ها",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "قیمت",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "انتخاب حساب...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "انتخاب تاریخ مانده",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "انتخاب ارز...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "انتخاب شرح...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "انتخاب تاریخ یادداشت",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "انتخاب دریافت‌کننده...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "تغییر وضعیت فراداده",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "تغییر وضعیت ثبت‌ها",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "تراکنش",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "تراکنش‌ها",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "واحدها",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "نوع دستورالعمل ناشناخته",
    description: "Message shown for unrecognized beancount directive types",
  },
};

export default faJournal;
