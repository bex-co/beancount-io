export interface TranslationEntry {
  message: string;
  description: string;
}

const faImporter: Record<string, TranslationEntry> = {
  // Premium Banner
  "importer.premiumBannerTitle": {
    message: "واردات هوشمند فعال است — دسترسی زودهنگام رایگان",
    description: "Title for premium feature banner",
  },
  "importer.premiumBannerDismiss": {
    message: "بستن بنر",
    description: "Aria label for dismiss banner button",
  },
  "importer.premiumBannerDescription": {
    message:
      "صورت‌حساب‌های بانکی را از PDF، فایل‌های OFX و تصاویر در چند ثانیه با تجزیه هوشمند مصنوعی وارد کنید. برای مدت محدود رایگان.",
    description: "Description of premium importer features",
  },

  // File Upload
  "importer.upload.title": {
    message: "بارگذاری فایل",
    description: "Title for file upload card",
  },
  "importer.upload.description": {
    message:
      "صورت‌حساب بانکی یا فایل تراکنش خود را بارگذاری کنید. فرمت‌های پشتیبانی‌شده: CSV، PDF، OFX یا تصاویر (PNG/JPG). حداکثر 10 مگابایت.",
    description: "Description of supported file formats and size limit",
  },
  "importer.upload.fileSizeError": {
    message:
      "این فایل از حد مجاز 10 مگابایت بیشتر است. لطفاً فایل کوچک‌تری امتحان کنید.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "این نوع فایل پشتیبانی نمی‌شود. لطفاً از فایل CSV، PDF، OFX یا تصویر (PNG، JPG) استفاده کنید.",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "در حال خواندن فایل شما\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.fileSize": {
    message: "{size} KB",
    description: "Display file size in KB",
  },
  "importer.upload.chooseDifferentFile": {
    message: "انتخاب فایل دیگر",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "فایل خود را اینجا رها کنید",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "پشتیبانی از CSV، PDF، OFX و تصاویر تا 10 مگابایت",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "مرور فایل‌ها",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "مرجع فرمت CSV",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "از ستون‌ها برای تاریخ (YYYY-MM-DD)، دریافت‌کننده، توضیحات و مبلغ استفاده کنید. مقادیر منفی نشان‌دهنده هزینه‌ها هستند.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "فایل‌های PDF، OFX و تصاویر به‌طور خودکار با هوش مصنوعی تجزیه می‌شوند — بدون نیاز به قالب‌بندی دستی.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "در حال تشخیص فرمت فایل...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "در حال تجزیه CSV روی دستگاه شما...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "پردازش با هوش مصنوعی (این ممکن است 5 تا 15 ثانیه طول بکشد)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "در حال پردازش...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message: "استفاده از هوش مصنوعی برای استخراج داده‌های تراکنش از فایل شما",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "پردازش سریع محلی برای فرمت CSV استاندارد",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "بارگذاری فایل دیگر",
    description: "Button to upload a different file after error",
  },
  "importer.error.premiumRequired": {
    message: "ویژگی ممتاز مورد نیاز است",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "نوع فایل فعلی نیاز به تجزیه با هوش مصنوعی دارد",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "ارتقا به ممتاز",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message:
      "فایل‌های PDF، OFX و تصاویر را به‌طور خودکار با هوش مصنوعی تجزیه کنید",
    description: "Description of premium parsing features",
  },
  "importer.error.processing": {
    message: "در حال پردازش...",
    description: "Button text while processing upgrade",
  },
  "importer.error.upgradeNow": {
    message: "اکنون ارتقا دهید",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "یا",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "استفاده از فرمت CSV",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message:
      "فایل‌های CSV را می‌توان به‌صورت رایگان بدون دسترسی ممتاز تجزیه کرد",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "دانلود نمونه CSV",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "تجزیه فایل ناموفق بود",
    description: "Title for parse failure error",
  },
  "importer.error.serverError": {
    message:
      "هنگام پردازش فایل شما خطای سرور رخ داد. لطفاً چند ثانیه دیگر دوباره امتحان کنید.",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "پیش‌نمایش داده‌های وارد شده",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message: "تراکنش‌های تجزیه‌شده را قبل از پیکربندی حساب‌ها بررسی کنید",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "معتبر",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "خطاها",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "ردیف",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "تاریخ",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "دریافت‌کننده",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "توضیحات",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "مبلغ",
    description: "Table header for amount column",
  },
  "importer.preview.status": {
    message: "وضعیت",
    description: "Table header for status column",
  },
  "importer.preview.noData": {
    message: "داده‌ای برای نمایش وجود ندارد",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "خطاهای اعتبارسنجی یافت شد",
    description: "Alert title for validation errors",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "برخی ردیف‌ها دارای خطاهای اعتبارسنجی هستند. لطفاً قبل از ادامه آنها را اصلاح کنید یا در هنگام واردات نادیده گرفته می‌شوند.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "بارگذاری فایل دیگر",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "ادامه به پیکربندی",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "YYYY-MM-DD",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "نام دریافت‌کننده",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "توضیحات",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "برای ویرایش کلیک کنید",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.errorStatus": {
    message: "خطا",
    description: "Status label for invalid rows",
  },
  "importer.preview.validStatus": {
    message: "معتبر",
    description: "Status label for valid rows",
  },
  "importer.preview.actions": {
    message: "اقدامات",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "حذف ردیف",
    description: "Aria label for delete row button",
  },
  "importer.preview.rowDeleted": {
    message: "ردیف حذف شد",
    description: "Toast message when row is deleted",
  },
  "importer.preview.emptyFileTitle": {
    message: "هیچ تراکنشی یافت نشد",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "فایل با موفقیت تجزیه شد، اما هیچ داده تراکنشی یافت نشد. لطفاً فایل خود را بررسی کنید و دوباره امتحان کنید.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.emptyFileHint": {
    message: "مطمئن شوید که فایل شما حاوی داده‌های تراکنش در قالب صحیح است.",
    description: "Hint for empty file state",
  },
  "importer.preview.retryUpload": {
    message: "فایل دیگری را امتحان کنید",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "پیکربندی تنظیمات واردات",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "حساب منبع و ارز را برای همه تراکنش‌ها تنظیم کنید، سپس حساب‌های مقصد را برای هر ردیف اختصاص دهید",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "حساب منبع",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "انتخاب حساب منبع...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "حساب بانکی که این تراکنش‌ها از آن آمده‌اند",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "ارز",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "ارز برای همه تراکنش‌ها",
    description: "Hint text for currency field",
  },
  "importer.configure.assignTargetAccounts": {
    message: "اختصاص حساب‌های مقصد",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "بازگشت",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "در حال واردات...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "وارد کردن {count} تراکنش",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "وارد کردن {count} تراکنش",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "وارد کردن {count} تراکنش",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "حساب منبع الزامی است",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "ارز الزامی است",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "حداقل یک تراکنش مورد نیاز است",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message: "همه تراکنش‌های انتخاب‌شده باید حساب مقصد داشته باشند",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "حداقل یک تراکنش باید انتخاب شود",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "جستجو بر اساس توضیحات...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "فیلتر بر اساس مبلغ",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "همه مبالغ",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "فقط مثبت",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "فقط منفی",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "انتخاب همه ردیف‌های قابل مشاهده",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "حساب مقصد",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "در حال دسته‌بندی...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "پر کردن با هوش مصنوعی",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "هیچ تراکنشی با فیلترهای شما مطابقت ندارد",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "تراکنشی برای پیکربندی وجود ندارد",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "انتخاب تراکنش",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "انتخاب حساب...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "برای ردیف‌های انتخاب‌شده الزامی است",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count} تراکنش فاقد حساب‌های مقصد هستند. لطفاً قبل از واردات، حساب‌های مقصد را برای همه ردیف‌های انتخاب‌شده اختصاص دهید.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count} تراکنش فاقد حساب مقصد است. لطفاً قبل از واردات، حساب‌های مقصد را برای همه ردیف‌های انتخاب‌شده اختصاص دهید.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count} تراکنش فاقد حساب‌های مقصد هستند. لطفاً قبل از واردات، حساب‌های مقصد را برای همه ردیف‌های انتخاب‌شده اختصاص دهید.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "دسته‌بندی با هوش مصنوعی کامل شد!",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "{count} تراکنش با موفقیت دسته‌بندی شدند",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "{count} تراکنش با موفقیت دسته‌بندی شد",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "{count} تراکنش با موفقیت دسته‌بندی شدند",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "دسته‌بندی با هوش مصنوعی ناموفق بود",
    description: "Toast title for failed AI categorization",
  },
  "importer.accountMapping.aiFailedDescription": {
    message: "دسته‌بندی ناموفق بود",
    description:
      "Toast description for failed AI categorization (will be replaced with actual error)",
  },

  // Importing Step
  "importer.importing.title": {
    message: "در حال واردات تراکنش‌ها...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message: "لطفاً منتظر بمانید تا تراکنش‌های شما را به دفتر کل اضافه کنیم",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "واردات موفق بود!",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "{count} تراکنش با موفقیت وارد شدند",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "{count} تراکنش با موفقیت وارد شد",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "{count} تراکنش با موفقیت وارد شدند",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count} تراکنش وارد نشدند",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count} تراکنش وارد نشد",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count} تراکنش وارد نشدند",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "مشاهده دفتر روزنامه",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "وارد کردن بیشتر",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "تراکنش‌های ناموفق:",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "ردیف",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.moreErrors": {
    message: "خطاهای بیشتر",
    description:
      "Text for showing additional error count (e.g. '...and 10 more errors')",
  },
  "importer.finish.failedTitle": {
    message: "واردات ناموفق بود",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "هنگام واردات تراکنش‌ها خطایی رخ داد",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "جزئیات خطا:",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "شروع مجدد",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "واردات هوشمند",
    description: "Page title for the importer page",
  },
};

export default faImporter;
