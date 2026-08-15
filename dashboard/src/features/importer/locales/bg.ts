export interface TranslationEntry {
  message: string;
  description: string;
}

const bgImporter: Record<string, TranslationEntry> = {
  // Premium Banner

  // File Upload
  "importer.upload.fileSizeError": {
    message:
      "Този файл надвишава лимита от 10 MB. Моля, опитайте с по-малък файл.",
    description: "Error message when file size exceeds limit",
  },
  "importer.upload.unsupportedFormatError": {
    message:
      "Този тип файл не се поддържа. Моля, използвайте CSV, PDF, OFX или изображение (PNG, JPG).",
    description: "Error message for unsupported file format",
  },
  "importer.upload.parsingFile": {
    message: "Четене на вашия файл\u2026",
    description: "Loading message while parsing file",
  },
  "importer.upload.chooseDifferentFile": {
    message: "Избери друг файл",
    description: "Button to select a different file",
  },
  "importer.upload.dragAndDrop": {
    message: "Пуснете файла си тук",
    description: "Instructions for drag and drop upload",
  },
  "importer.upload.supportedFormats": {
    message: "Поддържа CSV, PDF, OFX и изображения до 10 MB",
    description: "Supported file formats hint",
  },
  "importer.upload.chooseFile": {
    message: "Преглед на файлове",
    description: "Button to open file picker",
  },
  "importer.upload.csvFormatExample": {
    message: "Справка за CSV формат",
    description: "Label for CSV format example section",
  },
  "importer.upload.csvFormatHint": {
    message:
      "Използвайте колони за Дата (ГГГГ-ММ-ДД), Получател, Описание и Сума. Отрицателните стойности представляват разходи.",
    description: "Instructions for CSV file format",
  },
  "importer.upload.aiProcessingHint": {
    message:
      "PDF, OFX файлове и изображения се анализират автоматично с AI — без ръчно форматиране.",
    description: "Hint about AI processing for non-CSV files",
  },

  // Parsing Progress
  "importer.parsing.detectingFormat": {
    message: "Откриване на формата на файла...",
    description: "Message while detecting file format",
  },
  "importer.parsing.clientParsing": {
    message: "Анализиране на CSV на вашето устройство...",
    description: "Message during client-side CSV parsing",
  },
  "importer.parsing.serverParsing": {
    message: "Обработка с AI (това може да отнеме 5-15 секунди)...",
    description: "Message during server-side AI parsing",
  },
  "importer.parsing.processing": {
    message: "Обработка...",
    description: "Generic processing message",
  },
  "importer.parsing.serverParsingDescription": {
    message:
      "Използване на AI за извличане на данни за транзакции от вашия файл",
    description: "Description of AI parsing process",
  },
  "importer.parsing.clientParsingDescription": {
    message: "Бърза локална обработка за стандартен CSV формат",
    description: "Description of local CSV parsing",
  },

  // Parse Errors
  "importer.error.uploadDifferentFile": {
    message: "Качи друг файл",
    description: "Button to upload a different file after error",
  },
  "importer.error.premiumRequired": {
    message: "Изисква се премиум функция",
    description: "Title for premium required error",
  },
  "importer.error.premiumRequiredDescription": {
    message: "Текущият тип файл изисква AI анализ",
    description: "Description of why premium is required",
  },
  "importer.error.upgradeToPremium": {
    message: "Надградете до премиум",
    description: "Label for premium upgrade option",
  },
  "importer.error.upgradeDescription": {
    message: "Анализирайте PDF, OFX и изображения автоматично с AI",
    description: "Description of premium parsing features",
  },
  "importer.error.upgradeNow": {
    message: "Надградете сега",
    description: "Button text to start upgrade process",
  },
  "importer.error.or": {
    message: "Или",
    description: "Separator between upgrade and CSV options",
  },
  "importer.error.useCsvFormat": {
    message: "Използвайте CSV формат",
    description: "Label for CSV alternative option",
  },
  "importer.error.csvFreeAccess": {
    message:
      "CSV файловете могат да бъдат анализирани безплатно без премиум достъп",
    description: "Description of free CSV parsing",
  },
  "importer.error.downloadCsvExample": {
    message: "Изтегли CSV пример",
    description: "Button text to download CSV example file",
  },
  "importer.error.failedToParse": {
    message: "Неуспешен анализ на файла",
    description: "Title for parse failure error",
  },
  "importer.error.serverError": {
    message:
      "Възникна сървърна грешка при обработката на вашия файл. Моля, опитайте отново след няколко секунди.",
    description: "Description of server error",
  },
  // Preview Table
  "importer.preview.title": {
    message: "Преглед на импортираните данни",
    description: "Title for preview table",
  },
  "importer.preview.description": {
    message:
      "Прегледайте анализираните транзакции преди конфигуриране на сметките",
    description: "Description for preview table",
  },
  "importer.preview.validCount": {
    message: "Валидни",
    description: "Badge label for valid transaction count",
  },
  "importer.preview.errorsCount": {
    message: "Грешки",
    description: "Badge label for error transaction count",
  },
  "importer.preview.row": {
    message: "Ред",
    description: "Table header for row number column",
  },
  "importer.preview.date": {
    message: "Дата",
    description: "Table header for date column",
  },
  "importer.preview.payee": {
    message: "Получател",
    description: "Table header for payee column",
  },
  "importer.preview.description_column": {
    message: "Описание",
    description: "Table header for description column",
  },
  "importer.preview.amount": {
    message: "Сума",
    description: "Table header for amount column",
  },
  "importer.preview.noData": {
    message: "Няма данни за показване",
    description: "Empty state message when no transactions",
  },
  "importer.preview.validationErrorsTitle": {
    message: "Открити грешки при валидацията",
    description: "Alert title for validation errors",
  },
  "importer.preview.validationErrorsMessage": {
    message:
      "Някои редове имат грешки при валидацията. Моля, коригирайтеги преди да продължите или те ще бъдат пропуснати при импортирането.",
    description: "Alert message explaining validation errors",
  },
  "importer.preview.uploadDifferentFile": {
    message: "Качи друг файл",
    description: "Button to go back to upload step",
  },
  "importer.preview.continueToConfig": {
    message: "Продължи към конфигуриране",
    description: "Button to proceed to configuration step",
  },
  "importer.preview.dateFormat": {
    message: "ГГГГ-ММ-ДД",
    description: "Placeholder for date input format",
  },
  "importer.preview.payeePlaceholder": {
    message: "Име на получател",
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
    message: "Кликнете за редактиране",
    description: "Placeholder text for editable cells",
  },
  "importer.preview.actions": {
    message: "Действия",
    description: "Table header for actions column",
  },
  "importer.preview.deleteRow": {
    message: "Изтрий ред",
    description: "Aria label for delete row button",
  },
  "importer.preview.emptyFileTitle": {
    message: "Не са намерени транзакции",
    description: "Title when file is parsed but contains no data",
  },
  "importer.preview.emptyFileDescription": {
    message:
      "Файлът беше успешно анализиран, но не бяха намерени данни за транзакции. Моля, проверете файла си и опитайте отново.",
    description: "Description when file is parsed but contains no data",
  },
  "importer.preview.retryUpload": {
    message: "Опитайте друг файл",
    description: "Button text to retry file upload",
  },

  // Configure Step
  "importer.configure.title": {
    message: "Конфигуриране на настройките за импорт",
    description: "Title for configuration step",
  },
  "importer.configure.description": {
    message:
      "Задайте изходната сметка и валута за всички транзакции, след това назначете целеви сметки за всеки ред",
    description: "Description for configuration step",
  },
  "importer.configure.sourceAccount": {
    message: "Изходна сметка",
    description: "Label for source account field",
  },
  "importer.configure.sourceAccountPlaceholder": {
    message: "Изберете изходна сметка...",
    description: "Placeholder for source account selector",
  },
  "importer.configure.sourceAccountHint": {
    message: "Банковата сметка, от която са тези транзакции",
    description: "Hint text for source account field",
  },
  "importer.configure.currency": {
    message: "Валута",
    description: "Label for currency field",
  },
  "importer.configure.currencyHint": {
    message: "Валута за всички транзакции",
    description: "Hint text for currency field",
  },
  "importer.configure.assignTargetAccounts": {
    message: "Назначаване на целеви сметки",
    description: "Heading for account mapping section",
  },
  "importer.configure.back": {
    message: "Назад",
    description: "Button to go back to previous step",
  },
  "importer.configure.importing": {
    message: "Импортиране...",
    description: "Button text while importing",
  },
  "importer.configure.importButton": {
    message: "Импортирай {count} транзакции",
    description:
      "Button text to import transactions with count (base key for pluralization)",
  },
  "importer.configure.importButton_one": {
    message: "Импортирай {count} транзакция",
    description: "Button text to import single transaction with count",
  },
  "importer.configure.importButton_other": {
    message: "Импортирай {count} транзакции",
    description: "Button text to import multiple transactions with count",
  },
  "importer.configure.sourceAccountRequired": {
    message: "Изходната сметка е задължителна",
    description: "Validation error for missing source account",
  },
  "importer.configure.currencyRequired": {
    message: "Валутата е задължителна",
    description: "Validation error for missing currency",
  },
  "importer.configure.atLeastOneTransaction": {
    message: "Изисква се поне една транзакция",
    description: "Validation error when no transactions",
  },
  "importer.configure.allSelectedNeedAccount": {
    message: "Всички избрани транзакции трябва да имат целева сметка",
    description: "Validation error for selected transactions without account",
  },
  "importer.configure.atLeastOneSelected": {
    message: "Трябва да бъде избрана поне една транзакция",
    description: "Validation error when no transactions selected",
  },

  // Account Mapping Table
  "importer.accountMapping.searchPlaceholder": {
    message: "Търсене по описание...",
    description: "Placeholder for search input",
  },
  "importer.accountMapping.filterByAmount": {
    message: "Филтриране по сума",
    description: "Placeholder for amount filter",
  },
  "importer.accountMapping.allAmounts": {
    message: "Всички суми",
    description: "Filter option for all amounts",
  },
  "importer.accountMapping.positiveOnly": {
    message: "Само положителни",
    description: "Filter option for positive amounts",
  },
  "importer.accountMapping.negativeOnly": {
    message: "Само отрицателни",
    description: "Filter option for negative amounts",
  },
  "importer.accountMapping.selectAll": {
    message: "Избери всички видими редове",
    description: "Aria label for select all checkbox",
  },
  "importer.accountMapping.targetAccount": {
    message: "Целева сметка",
    description: "Table header for target account column",
  },
  "importer.accountMapping.categorizing": {
    message: "Категоризиране...",
    description: "Button text while AI is categorizing",
  },
  "importer.accountMapping.aiFill": {
    message: "AI попълване",
    description: "Button text for AI categorization",
  },
  "importer.accountMapping.noMatch": {
    message: "Няма транзакции, отговарящи на вашите филтри",
    description: "Empty state when filters return no results",
  },
  "importer.accountMapping.noConfigure": {
    message: "Няма транзакции за конфигуриране",
    description: "Empty state when no transactions available",
  },
  "importer.accountMapping.selectTransaction": {
    message: "Избери транзакция",
    description:
      "Aria label for transaction checkbox (number will be appended)",
  },
  "importer.accountMapping.selectAccountPlaceholder": {
    message: "Избери сметка...",
    description: "Placeholder for account selector",
  },
  "importer.accountMapping.requiredForSelected": {
    message: "Задължително за избраните редове",
    description: "Validation error for missing target account",
  },
  "importer.accountMapping.missingAccountAlert": {
    message:
      "{count} транзакции нямат целеви сметки. Моля, назначете целеви сметки за всички избрани редове преди импортиране.",
    description:
      "Alert message for transactions missing target accounts (base key for pluralization)",
  },
  "importer.accountMapping.missingAccountAlert_one": {
    message:
      "{count} транзакция няма целева сметка. Моля, назначете целеви сметки за всички избрани редове преди импортиране.",
    description: "Alert message for single transaction missing target account",
  },
  "importer.accountMapping.missingAccountAlert_other": {
    message:
      "{count} транзакции нямат целеви сметки. Моля, назначете целеви сметки за всички избрани редове преди импортиране.",
    description:
      "Alert message for multiple transactions missing target accounts",
  },
  "importer.accountMapping.aiSuccess": {
    message: "AI категоризацията завърши!",
    description: "Toast title for successful AI categorization",
  },
  "importer.accountMapping.aiSuccessDescription": {
    message: "Успешно категоризирани {count} транзакции",
    description:
      "Toast description for AI categorization (base key for pluralization)",
  },
  "importer.accountMapping.aiSuccessDescription_one": {
    message: "Успешно категоризирана {count} транзакция",
    description: "Toast description for single transaction categorization",
  },
  "importer.accountMapping.aiSuccessDescription_other": {
    message: "Успешно категоризирани {count} транзакции",
    description: "Toast description for multiple transactions categorization",
  },
  "importer.accountMapping.aiFailed": {
    message: "AI категоризацията се провали",
    description: "Toast title for failed AI categorization",
  },

  // Importing Step
  "importer.importing.title": {
    message: "Импортиране на транзакции...",
    description: "Title shown during import process",
  },
  "importer.importing.description": {
    message:
      "Моля, изчакайте, докато добавяме вашите транзакции към главната книга",
    description: "Description shown during import process",
  },

  // Finish Step
  "importer.finish.successTitle": {
    message: "Импортирането е успешно!",
    description: "Title for successful import",
  },
  "importer.finish.successMessage": {
    message: "Успешно импортирани {count} транзакции",
    description:
      "Success message for transactions with count (base key for pluralization)",
  },
  "importer.finish.successMessage_one": {
    message: "Успешно импортирана {count} транзакция",
    description: "Success message for single transaction with count",
  },
  "importer.finish.successMessage_other": {
    message: "Успешно импортирани {count} транзакции",
    description: "Success message for multiple transactions with count",
  },
  "importer.finish.partialFailure": {
    message: "{count} транзакции не успяха да се импортират",
    description:
      "Partial failure message for transactions (base key for pluralization)",
  },
  "importer.finish.partialFailure_one": {
    message: "{count} транзакция не успя да се импортира",
    description: "Partial failure message for single transaction",
  },
  "importer.finish.partialFailure_other": {
    message: "{count} транзакции не успяха да се импортират",
    description: "Partial failure message for multiple transactions",
  },
  "importer.finish.viewJournal": {
    message: "Виж дневника",
    description: "Button to view journal after import",
  },
  "importer.finish.importMore": {
    message: "Импортирай още",
    description: "Button to import more transactions",
  },
  "importer.finish.failedTransactions": {
    message: "Неуспешни транзакции:",
    description: "Alert header for failed transactions",
  },
  "importer.finish.rowPrefix": {
    message: "Ред",
    description:
      "Prefix for row number in error messages (e.g. 'Row 5: error')",
  },
  "importer.finish.moreErrors": {
    message: "още грешки",
    description:
      "Text for showing additional error count (e.g. '...and 10 more errors')",
  },
  "importer.finish.failedTitle": {
    message: "Импортирането се провали",
    description: "Title for failed import",
  },
  "importer.finish.failedMessage": {
    message: "Възникна грешка при импортирането на транзакции",
    description: "Default error message for failed import",
  },
  "importer.finish.errorDetails": {
    message: "Детайли за грешката:",
    description: "Alert header for error details",
  },
  "importer.finish.startOver": {
    message: "Започни отначало",
    description: "Button to restart import process",
  },
  "page.importer.title": {
    message: "Умен импорт",
    description: "Page title for the importer page",
  },
};

export default bgImporter;
