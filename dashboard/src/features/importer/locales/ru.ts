export interface TranslationEntry {
  message: string;
  description: string;
}

const ruImporter: Record<string, TranslationEntry> = {
  // Premium Banner
  "importer.premiumBannerTitle": {
    message: "Умный импорт доступен — Бесплатный ранний доступ",
    description: "Title for premium feature banner",
  },
  "importer.premiumBannerDismiss": {
    message: "Закрыть баннер",
    description: "Aria label for dismiss banner button",
  },
  "importer.premiumBannerDescription": {
    message:
      "Импортируйте банковские выписки из PDF, OFX-файлов и изображений за секунды с анализом ИИ. Бесплатно в течение ограниченного времени.",
    description: "Description of premium importer features",
  },

  // File Upload
  "importer.upload.title": {
    message: "Загрузить файл",
    description: "Title for file upload card",
  },
  "importer.upload.description": {
    message:
      "Загрузите выписку из банка или файл транзакций. Поддерживаемые форматы: CSV, PDF, OFX или изображения (PNG/JPG). Максимум 10МБ.",
    description: "Description of supported file formats and size limit",
  },
  "importer.upload.fileSizeError": {
    message:
      "Этот файл превышает лимит в 10 МБ. Пожалуйста, попробуйте файл поменьше.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "Этот тип файла не поддерживается. Пожалуйста, используйте CSV, PDF, OFX или изображение (PNG, JPG).",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "Чтение вашего файла\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.fileSize": {
    message: "{size} KB",
    description: "Display file size in KB",
  },
  "importer.upload.chooseDifferentFile": {
    message: "Выбрать другой файл",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "Поместите файл сюда",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "Поддерживает CSV, PDF, OFX и изображения до 10 МБ",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "Обзор файлов",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "Справка по формату CSV",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "Используйте столбцы: Дата (ГГГГ-ММ-ДД), Получатель, Описание и Сумма. Отрицательные значения обозначают расходы.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "PDF, OFX-файлы и изображения анализируются автоматически с помощью ИИ — без ручного форматирования.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "Определение формата файла...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "Анализ CSV на вашем устройстве...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "Обработка с помощью ИИ (это может занять 5-15 секунд)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "Обработка...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message:
      "Использование ИИ для извлечения данных транзакций из вашего файла",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "Быстрая локальная обработка для стандартного формата CSV",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "Загрузить другой файл",
    description: "Button to upload a different file after error",
  },
  "importer.error.premiumRequired": {
    message: "Требуется премиум-функция",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "Текущий тип файла требует анализа с помощью ИИ",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "Перейти на премиум",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message: "Автоматически анализируйте PDF, OFX и изображения с помощью ИИ",
    description: "Description of premium parsing features",
  },
  "importer.error.processing": {
    message: "Обработка...",
    description: "Button text while processing upgrade",
  },
  "importer.error.upgradeNow": {
    message: "Обновить сейчас",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "Или",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "Использовать формат CSV",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message: "CSV файлы можно анализировать бесплатно без премиум доступа",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "Скачать пример CSV",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "Не удалось проанализировать файл",
    description: "Title for parse failure error",
  },
  "importer.error.serverError": {
    message:
      "Произошла ошибка сервера при обработке вашего файла. Пожалуйста, повторите попытку через несколько секунд.",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "Предварительный просмотр импортированных данных",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message: "Проверьте проанализированные транзакции перед настройкой счетов",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "Действительные",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "Ошибки",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "Строка",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "Дата",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "Получатель",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "Описание",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "Сумма",
    description: "Table header for amount column",
  },
  "importer.preview.status": {
    message: "Статус",
    description: "Table header for status column",
  },
  "importer.preview.noData": {
    message: "Нет данных для отображения",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "Обнаружены ошибки проверки",
    description: "Alert title for validation errors",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "Некоторые строки содержат ошибки проверки. Пожалуйста, исправьте их перед продолжением, иначе они будут пропущены при импорте.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "Загрузить другой файл",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "Перейти к настройке",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "ГГГГ-ММ-ДД",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "Имя получателя",
    description: "Placeholder for payee input",
  },
  "importer.preview.descriptionPlaceholder": {
    message: "Описание",
    description: "Placeholder for description input",
  },
  "importer.preview.amountPlaceholder": {
    message: "0.00",
    description: "Placeholder for amount input",
  },
  "importer.preview.clickToEdit": {
    message: "Нажмите для редактирования",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.errorStatus": {
    message: "Ошибка",
    description: "Status label for invalid rows",
  },
  "importer.preview.validStatus": {
    message: "Действителен",
    description: "Status label for valid rows",
  },
  "importer.preview.actions": {
    message: "Действия",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "Удалить строку",
    description: "Aria label for delete row button",
  },
  "importer.preview.rowDeleted": {
    message: "Строка удалена",
    description: "Toast message when row is deleted",
  },
  "importer.preview.emptyFileTitle": {
    message: "Транзакции не найдены",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "Файл был успешно проанализирован, но данные о транзакциях не найдены. Пожалуйста, проверьте ваш файл и попробуйте снова.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.emptyFileHint": {
    message:
      "Убедитесь, что ваш файл содержит данные о транзакциях в правильном формате.",
    description: "Hint for empty file state",
  },
  "importer.preview.retryUpload": {
    message: "Попробовать другой файл",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "Настроить параметры импорта",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "Установите исходный счет и валюту для всех транзакций, затем назначьте целевые счета для каждой строки",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "Исходный счет",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "Выберите исходный счет...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "Банковский счет, с которого пришли эти транзакции",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "Валюта",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "Валюта для всех транзакций",
    description: "Hint text for currency field",
  },
  "importer.configure.assignTargetAccounts": {
    message: "Назначить целевые счета",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "Назад",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "Импорт...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "Импортировать {count} транзакций",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "Импортировать {count} транзакцию",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "Импортировать {count} транзакций",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "Исходный счет обязателен",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "Валюта обязательна",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "Требуется хотя бы одна транзакция",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message: "Все выбранные транзакции должны иметь целевой счет",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "Должна быть выбрана хотя бы одна транзакция",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "Поиск по описанию...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "Фильтр по сумме",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "Все суммы",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "Только положительные",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "Только отрицательные",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "Выбрать все видимые строки",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "Целевой счет",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "Категоризация...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "Заполнение ИИ",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "Нет транзакций, соответствующих вашим фильтрам",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "Нет транзакций для настройки",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "Выбрать транзакцию",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "Выбрать счет...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "Обязательно для выбранных строк",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count} транзакций не имеют целевых счетов. Пожалуйста, назначьте целевые счета для всех выбранных строк перед импортом.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count} транзакция не имеет целевого счета. Пожалуйста, назначьте целевые счета для всех выбранных строк перед импортом.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count} транзакций не имеют целевых счетов. Пожалуйста, назначьте целевые счета для всех выбранных строк перед импортом.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "Категоризация ИИ завершена!",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "{count} транзакций успешно категоризированы",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "{count} транзакция успешно категоризирована",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "{count} транзакций успешно категоризированы",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "Категоризация ИИ не удалась",
    description: "Toast title for failed AI categorization",
  },
  "importer.accountMapping.aiFailedDescription": {
    message: "Не удалось категоризировать",
    description:
      "Toast description for failed AI categorization (will be replaced with actual error)",
  },

  // Importing Step
  "importer.importing.title": {
    message: "Импорт транзакций...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message:
      "Пожалуйста, подождите, пока мы добавляем ваши транзакции в главную книгу",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "Импорт выполнен успешно!",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "{count} транзакций успешно импортированы",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "{count} транзакция успешно импортирована",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "{count} транзакций успешно импортированы",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count} транзакций не удалось импортировать",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count} транзакция не удалось импортировать",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count} транзакций не удалось импортировать",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "Посмотреть журнал",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "Импортировать еще",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "Неудачные транзакции:",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "Строка",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.moreErrors": {
    message: "еще ошибок",
    description:
      "Text for showing additional error count (e.g. '...and 10 more errors')",
  },
  "importer.finish.failedTitle": {
    message: "Импорт не удался",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "Произошла ошибка при импорте транзакций",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "Подробности ошибки:",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "Начать сначала",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "Умный импорт",
    description: "Page title for the importer page",
  },
};

export default ruImporter;
