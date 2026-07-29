export interface TranslationEntry {
  message: string;
  description: string;
}

const ukImporter: Record<string, TranslationEntry> = {
  // Premium Banner
  "importer.premiumBannerTitle": {
    message: "Розумний імпорт доступний — Безкоштовний ранній доступ",
    description: "Title for premium feature banner",
  },
  "importer.premiumBannerDismiss": {
    message: "Закрити банер",
    description: "Aria label for dismiss banner button",
  },
  "importer.premiumBannerDescription": {
    message:
      "Імпортуйте банківські виписки з PDF, OFX-файлів та зображень за секунди з аналізом ШІ. Безкоштовно протягом обмеженого часу.",
    description: "Description of premium importer features",
  },

  // File Upload
  "importer.upload.title": {
    message: "Завантажити файл",
    description: "Title for file upload card",
  },
  "importer.upload.description": {
    message:
      "Завантажте свою банківську виписку або файл транзакцій. Підтримувані формати: CSV, PDF, OFX або зображення (PNG/JPG). Максимум 10МБ.",
    description: "Description of supported file formats and size limit",
  },
  "importer.upload.fileSizeError": {
    message:
      "Цей файл перевищує ліміт у 10 МБ. Будь ласка, спробуйте менший файл.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "Цей тип файлу не підтримується. Будь ласка, використовуйте CSV, PDF, OFX або зображення (PNG, JPG).",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "Читання вашого файлу\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.fileSize": {
    message: "{size} KB",
    description: "Display file size in KB",
  },
  "importer.upload.chooseDifferentFile": {
    message: "Вибрати інший файл",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "Покладіть файл сюди",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "Підтримує CSV, PDF, OFX та зображення до 10 МБ",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "Огляд файлів",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "Довідка формату CSV",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "Використовуйте стовпці: Дата (РРРР-ММ-ДД), Одержувач, Опис та Сума. Від'ємні значення позначають витрати.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "PDF, OFX-файли та зображення аналізуються автоматично за допомогою ШІ — без ручного форматування.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "Визначення формату файлу...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "Аналіз CSV на вашому пристрої...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "Обробка за допомогою ШІ (це може зайняти 5-15 секунд)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "Обробка...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message: "Використання ШІ для вилучення даних транзакцій з вашого файлу",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "Швидка локальна обробка для стандартного формату CSV",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "Завантажити інший файл",
    description: "Button to upload a different file after error",
  },
  "importer.error.premiumRequired": {
    message: "Потрібна преміум-функція",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "Поточний тип файлу потребує аналізу за допомогою ШІ",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "Перейти на преміум",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message: "Автоматично аналізуйте PDF, OFX та зображення за допомогою ШІ",
    description: "Description of premium parsing features",
  },
  "importer.error.processing": {
    message: "Обробка...",
    description: "Button text while processing upgrade",
  },
  "importer.error.upgradeNow": {
    message: "Оновити зараз",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "Або",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "Використовувати формат CSV",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message: "CSV файли можна аналізувати безкоштовно без преміум доступу",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "Завантажити приклад CSV",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "Не вдалося проаналізувати файл",
    description: "Title for parse failure error",
  },
  "importer.error.serverError": {
    message:
      "Сталася помилка сервера під час обробки вашого файлу. Будь ласка, спробуйте знову через кілька секунд.",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "Попередній перегляд імпортованих даних",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message: "Перевірте проаналізовані транзакції перед налаштуванням рахунків",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "Дійсні",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "Помилки",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "Рядок",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "Дата",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "Одержувач",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "Опис",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "Сума",
    description: "Table header for amount column",
  },
  "importer.preview.status": {
    message: "Статус",
    description: "Table header for status column",
  },
  "importer.preview.noData": {
    message: "Немає даних для відображення",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "Виявлено помилки перевірки",
    description: "Alert title for validation errors",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "Деякі рядки містять помилки перевірки. Будь ласка, виправте їх перед продовженням, інакше вони будуть пропущені під час імпорту.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "Завантажити інший файл",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "Перейти до налаштування",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "РРРР-ММ-ДД",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "Ім'я одержувача",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "Опис",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "Натисніть для редагування",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.errorStatus": {
    message: "Помилка",
    description: "Status label for invalid rows",
  },
  "importer.preview.validStatus": {
    message: "Дійсний",
    description: "Status label for valid rows",
  },
  "importer.preview.actions": {
    message: "Дії",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "Видалити рядок",
    description: "Aria label for delete row button",
  },
  "importer.preview.rowDeleted": {
    message: "Рядок видалено",
    description: "Toast message when row is deleted",
  },
  "importer.preview.emptyFileTitle": {
    message: "Транзакції не знайдено",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "Файл був успішно проаналізований, але дані про транзакції не знайдено. Будь ласка, перевірте ваш файл і спробуйте знову.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.emptyFileHint": {
    message:
      "Переконайтеся, що ваш файл містить дані про транзакції у правильному форматі.",
    description: "Hint for empty file state",
  },
  "importer.preview.retryUpload": {
    message: "Спробувати інший файл",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "Налаштувати параметри імпорту",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "Встановіть вихідний рахунок і валюту для всіх транзакцій, потім призначте цільові рахунки для кожного рядка",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "Вихідний рахунок",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "Виберіть вихідний рахунок...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "Банківський рахунок, з якого надійшли ці транзакції",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "Валюта",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "Валюта для всіх транзакцій",
    description: "Hint text for currency field",
  },
  "importer.configure.assignTargetAccounts": {
    message: "Призначити цільові рахунки",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "Назад",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "Імпорт...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "Імпортувати {count} транзакцій",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "Імпортувати {count} транзакцію",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "Імпортувати {count} транзакцій",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "Вихідний рахунок обов'язковий",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "Валюта обов'язкова",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "Потрібна принаймні одна транзакція",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message: "Всі вибрані транзакції повинні мати цільовий рахунок",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "Має бути вибрана принаймні одна транзакція",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "Пошук за описом...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "Фільтр за сумою",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "Всі суми",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "Тільки позитивні",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "Тільки негативні",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "Вибрати всі видимі рядки",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "Цільовий рахунок",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "Категоризація...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "Заповнення ШІ",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "Немає транзакцій, що відповідають вашим фільтрам",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "Немає транзакцій для налаштування",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "Вибрати транзакцію",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "Вибрати рахунок...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "Обов'язково для вибраних рядків",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count} транзакцій не мають цільових рахунків. Будь ласка, призначте цільові рахунки для всіх вибраних рядків перед імпортом.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count} транзакція не має цільового рахунку. Будь ласка, призначте цільові рахунки для всіх вибраних рядків перед імпортом.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count} транзакцій не мають цільових рахунків. Будь ласка, призначте цільові рахунки для всіх вибраних рядків перед імпортом.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "Категоризація ШІ завершена!",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "{count} транзакцій успішно категоризовані",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "{count} транзакція успішно категоризована",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "{count} транзакцій успішно категоризовані",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "Категоризація ШІ не вдалася",
    description: "Toast title for failed AI categorization",
  },
  "importer.accountMapping.aiFailedDescription": {
    message: "Не вдалося категоризувати",
    description:
      "Toast description for failed AI categorization (will be replaced with actual error)",
  },

  // Importing Step
  "importer.importing.title": {
    message: "Імпорт транзакцій...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message:
      "Будь ласка, зачекайте, поки ми додаємо ваші транзакції до головної книги",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "Імпорт виконано успішно!",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "{count} транзакцій успішно імпортовані",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "{count} транзакція успішно імпортована",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "{count} транзакцій успішно імпортовані",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count} транзакцій не вдалося імпортувати",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count} транзакцію не вдалося імпортувати",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count} транзакцій не вдалося імпортувати",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "Переглянути журнал",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "Імпортувати більше",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "Невдалі транзакції:",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "Рядок",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.moreErrors": {
    message: "ще помилок",
    description:
      "Text for showing additional error count (e.g. '...and 10 more errors')",
  },
  "importer.finish.failedTitle": {
    message: "Імпорт не вдався",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "Сталася помилка під час імпорту транзакцій",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "Деталі помилки:",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "Почати спочатку",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "Розумний імпорт",
    description: "Page title for the importer page",
  },
};

export default ukImporter;
