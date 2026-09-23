export interface TranslationEntry {
  message: string;
  description: string;
}

const ruJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Счёт",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "Счёт (например, Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Счёт обязателен",
    description: "Validation error when account is missing",
  },
  "journal.addNewJournalEntry": {
    message: "Добавить новую запись в журнал",
    description: "Aria label for add new journal entry button",
  },
  "journal.amountMustBeNumber": {
    message: "Сумма должна быть допустимым числом",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "Сумма (например, 100.00)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "Сумма обязательна",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastTwoPostings": {
    message: "Требуется минимум две проводки",
    description: "Validation error when less than two postings exist",
  },
  "journal.balance": {
    message: "Баланс",
    description: "Balance entry type",
  },
  "journal.balanceHeader": {
    message: "Баланс",
    description: "Table header for balance column",
  },
  "journal.balancesAfterEntry": {
    message: "Балансы после записи",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Балансы до записи",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "B",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Записи бюджета",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "Изменение",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "Проведённые транзакции",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "Закрыть",
    description: "Close account entry type filter",
  },
  "journal.createNewJournalEntry": {
    message: "Создать новую запись в журнале для этой главной книги",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "Создать запись счёта",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "Создать запись баланса",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "Создать запись заметки",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "Создать запись транзакции",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "Валюта (например, USD)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "Валюта обязательна",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "Произвольный",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "Дата",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "D",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "Обнаруженные документы",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Документ",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message:
      "Скачивает исходные транзакции и проверки баланса, ограниченные выбранной датой, счётом и поисковым выражением. Фильтры типа записи и статуса транзакции не применяются.",
    description: "Honest scope for the plaintext journal export dialog",
  },
  "journal.entryContext": {
    message: "Контекст записи",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "Запись успешно создана",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Расположение:",
    description: "Label for entry location in file",
  },
  "journal.entryLocationUnavailable": {
    message: "Расположение источника недоступно",
    description:
      "Показывается, когда у контекста записи нет файла/строки для перехода",
  },
  "journal.openEntrySource": {
    message: "Открыть источник в {location}",
    description: "Accessible name for the entry source location control",
  },
  "journal.errorLoadingJournalEntries": {
    message: "Ошибка загрузки записей журнала",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "Экспорт",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "Экспорт журнала",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Экспортирование...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "Не удалось создать запись баланса",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "Не удалось создать заметку",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "Не удалось создать транзакцию",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "Не удалось экспортировать журнал",
    description: "Error message when journal export fails",
  },
  "journal.flag": {
    message: "Флаг",
    description: "Accessible name for the journal flag column",
  },
  "journal.flagAbbrev": {
    message: "F",
    description: "Short label shown in the journal flag column header",
  },
  "journal.accountJournalTable": {
    message: "Журнал счёта",
    description: "Accessible name for the account journal table",
  },
  "journal.journalTable": {
    message: "Журнал",
    description: "Accessible name for the ledger journal table",
  },
  "journal.journal": {
    message: "Журнал",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Журнал успешно экспортирован",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "L",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Связанные документы",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Загрузка контекста записи...",
    description: "Loading message while fetching entry context",
  },
  "journal.metadata": {
    message: "Метаданные",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "Описание",
    description: "Placeholder for narration field",
  },
  "journal.newEntry": {
    message: "Новая запись",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "Валюты не найдены",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "Записи журнала не найдены для текущих фильтров.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noNarrationsFound": {
    message: "Описания не найдены",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "Получатели платежей не найдены",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "Заметка",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "Содержание заметки",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Содержание заметки обязательно",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "Открыть",
    description: "Open account entry type filter",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "Прочие транзакции",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Заполнение",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "Получатель/Описание",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Получатель",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Ожидающие транзакции",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "Проводки",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Цена",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "Выберите счёт...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectCurrency": {
    message: "Выберите валюту...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Выберите описание...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectPayee": {
    message: "Выберите получателя платежа...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "Переключить метаданные",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.postingsAlwaysVisible": {
    message: "Проводки всегда видны",
    description:
      "Статический индикатор, когда глобальный фильтр проводок держит все строки открытыми",
  },
  "journal.togglePostings": {
    message: "Переключить проводки",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "Транзакция",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "Транзакции",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "Единицы",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "Неизвестный тип директивы",
    description: "Message shown for unrecognized beancount directive types",
  },
  "journal.sourceModified": {
    message: "Источник изменен.",
    description: "Notice that entry source has unsaved changes",
  },
  "journal.entrySavedSuccess": {
    message: "Запись успешно сохранена",
    description: "Toast shown after saving an entry",
  },
  "journal.entryDeleteTitle": {
    message: "Удалить запись",
    description: "Dialog title for the entry deletion confirmation",
  },
  "journal.entryDeleteDescription": {
    message:
      "Удалить запись в {location}? Она будет удалена из книги, и это действие нельзя отменить в приложении.",
    description:
      "Confirmation message for deleting a journal entry. {location} is replaced with the entry's source location.",
  },
  "journal.entryDeleteConfirm": {
    message: "Удалить запись",
    description: "Confirm button label in the entry deletion confirmation",
  },
  "journal.entryDeleteCancel": {
    message: "Отмена",
    description: "Cancel button label in the entry deletion confirmation",
  },
  "journal.entryDeletedSuccess": {
    message: "Запись успешно удалена",
    description: "Toast shown after deleting an entry",
  },
  "journal.noEntryContext": {
    message: "Данные контекста ввода недоступны.",
    description: "Empty state for entry context",
  },
  "journal.accumulated": {
    message: "накопилось",
    description: "Label before an accumulated balance difference",
  },
  "journal.fromAccount": {
    message: "из",
    description: "Label before a pad source account",
  },
  "journal.clearedStatus": {
    message: "Очистено",
    description: "Cleared transaction status",
  },
  "journal.pendingStatus": {
    message: "Ожидается",
    description: "Pending transaction status",
  },
  "journal.blankStatus": {
    message: "(пусто)",
    description: "Blank transaction status option",
  },
  "journal.addPosting": {
    message: "Добавить проводку",
    description: "Accessible name for adding a transaction posting row",
  },
  "journal.removePosting": {
    message: "Удалить проводку {number}",
    description:
      "Accessible name for removing a numbered transaction posting row",
  },
  "journal.autoAmount": {
    message: "авто",
    description: "Label for an automatically balanced amount",
  },
  "journal.generatedEntryTitle": {
    message: "Сгенерированная запись",
    description:
      "Heading for the read-only panel shown for a generated (padding) entry",
  },
  "journal.generatedConversionExplanation": {
    message:
      "Это преобразование создано, чтобы закрыть остаточное сальдо по себестоимости в журнале, ограниченном по времени, поэтому у него нет исходной строки для просмотра, изменения или удаления.",
    description:
      "Explains that a generated conversion entry has no editable source directive",
  },
  "journal.generatedEntryExplanation": {
    message:
      "Beancount создал эту запись из директивы pad, поэтому у неё нет исходной строки для просмотра, изменения или удаления.",
    description:
      "Explains that a generated padding entry has no editable source directive",
  },
  "journal.generatedOpeningExplanation": {
    message:
      "Это начальное сальдо создано при ограничении журнала счёта временным диапазоном, поэтому у него нет исходной строки для просмотра, изменения или удаления.",
    description:
      "Explains that a generated opening-balance entry has no editable source directive",
  },
  "journal.narration": {
    message: "Описание",
    description: "Label for narration field",
  },

  "journal.backToJournal": {
    message: "Назад к журналу",
    description: "Link from the entry page back to the ledger journal",
  },
  "journal.entryPageTitle": {
    message: "Запись",
    description: "Entry page heading for a shared ledger entry URL",
  },
  "journal.entryPageDescription": {
    message: "Исходный контекст записи в {ledgerName}.",
    description:
      "Entry page description; {ledgerName} is the ledger display name",
  },
  "journal.managedPriceEntryExplanation": {
    message:
      "Эта цена получена из управляемого источника {source}. Она обновляется автоматически и не может быть изменена или удалена здесь; чтобы заменить её, добавьте собственную запись цены на эту дату.",
    description:
      "Shown on a price entry that comes from a managed price include. {source} is the feed URL.",
  },
};

export default ruJournal;
