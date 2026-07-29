export interface TranslationEntry {
  message: string;
  description: string;
}

const ruJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Счёт",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPicker": {
    message: "Выбор счёта",
    description: "Dialog or dropdown title for selecting account",
  },
  "journal.accountPlaceholder": {
    message: "Счёт (e.g., Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Счёт is required",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "Счета",
    description: "Plural form of account",
  },
  "journal.accountsPlural": {
    message: "счета",
    description: "Lowercase plural form of accounts",
  },
  "journal.addNewJournalEntry": {
    message: "Добавить новую запись в журнал",
    description: "Aria label for add new journal entry button",
  },
  "journal.addPosting": {
    message: "Добавить проводку",
    description: "Button text to add a new posting to transaction",
  },
  "journal.addTransaction": {
    message: "Добавить транзакцию",
    description: "Button to add a new transaction",
  },
  "journal.amountEmptyError": {
    message: "Пожалуйста, введите сумму",
    description: "Validation error when amount is not provided",
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
  "journal.atLeastOnePosting": {
    message: "Требуется хотя бы одна проводка",
    description: "Validation error when no postings exist",
  },
  "journal.atLeastTwoPostings": {
    message: "Требуется минимум две проводки",
    description: "Validation error when less than two postings exist",
  },
  "journal.balance": {
    message: "Balance",
    description: "Balance entry type",
  },
  "journal.balanceHeader": {
    message: "Balance",
    description: "Table header for balance column",
  },
  "journal.balancesAfterEntry": {
    message: "Balances after entry",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Balances before entry",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "B",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Budget entries",
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
    message: "Очиститьed transactions",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "Закрыть",
    description: "Close account entry type filter",
  },
  "journal.closeAccount": {
    message: "Закрыть счёт",
    description: "Action to close an existing account",
  },
  "journal.cost": {
    message: "Стоимость",
    description: "Table header for cost column",
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
    message: "Discovered documents",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Document",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message: "Download currently filtered entries as a Beancount file",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "Запись Context",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "Запись created successfully",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Location:",
    description: "Label for entry location in file",
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
    message: "Экспорт Journal",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Экспортing...",
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
  "journal.flagPlaceholder": {
    message: "Флаг (например, *)",
    description: "Placeholder for transaction flag",
  },
  "journal.from": {
    message: "От",
    description: "Label for source account in transaction",
  },
  "journal.journal": {
    message: "Журнал",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Журнал успешно экспортирован",
    description: "Success message after exporting journal",
  },
  "journal.journalLoadError": {
    message: "Ошибка загрузки журнала: ",
    description: "Error message prefix when journal fails to load",
  },
  "journal.journalWelcomeInstruction1": {
    message: 'Используйте "Add Transaction" button to create entries',
    description: "First instruction for getting started",
  },
  "journal.journalWelcomeInstruction2": {
    message: "Загружайте файлы beancount через веб-интерфейс",
    description: "Second instruction for getting started",
  },
  "journal.journalWelcomeInstruction3": {
    message: "Импортируйте существующие данные учёта",
    description: "Third instruction for getting started",
  },
  "journal.journalWelcomeInstructionFinal": {
    message: "Как только вы добавите транзакции, они появятся здесь.",
    description: "Final instruction message",
  },
  "journal.journalWelcomeInstructions": {
    message: "Чтобы начать:",
    description: "Header for getting started instructions",
  },
  "journal.journalWelcomeMessage": {
    message: "У вас пока нет записей в журнале.",
    description: "Welcome message for empty journal",
  },
  "journal.journalWelcomeTitle": {
    message: "Добро пожаловать в ваш Журнал! 📔",
    description: "Welcome title for empty journal page",
  },
  "journal.linked": {
    message: "L",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Linked documents",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Loading entry context...",
    description: "Loading message while fetching entry context",
  },
  "journal.loadingMore": {
    message: "Загружается ещё...",
    description: "Loading message when fetching more entries",
  },
  "journal.metadata": {
    message: "Metadata",
    description: "Label for metadata toggle filter",
  },
  "journal.narration": {
    message: "Описание",
    description: "Label for transaction description/notes field",
  },
  "journal.narrationPlaceholder": {
    message: "Описание",
    description: "Placeholder for narration field",
  },
  "journal.narrationRequired": {
    message: "Описание is required",
    description: "Validation error when narration is missing",
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
  "journal.noMoreEntries": {
    message: "Больше записей нет",
    description: "Message when no more entries to load",
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
    message: "Заметка content",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Заметка content is required",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "Открыть",
    description: "Open account entry type filter",
  },
  "journal.openAccount": {
    message: "Открыть счёт",
    description: "Action to open a new account",
  },
  "journal.other": {
    message: "x",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "Прочее transactions",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Pad",
    description: "Pad entry type filter",
  },
  "journal.payee": {
    message: "Получатель",
    description: "Label for payee field in transaction",
  },
  "journal.payeeNarration": {
    message: "Payee/Narration",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Payee",
    description: "Placeholder for payee field",
  },
  "journal.payeeRequired": {
    message: "Payee is required",
    description: "Validation error when payee is missing",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Pending transactions",
    description: "Filter tooltip for pending transactions",
  },
  "journal.pleaseInput": {
    message: "Пожалуйста, введите...",
    description: "Placeholder text prompting user to input",
  },
  "journal.posting": {
    message: "Posting",
    description: "Label for posting section in transaction form",
  },
  "journal.postings": {
    message: "Проводки",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Price",
    description: "Price entry type filter",
  },
  "journal.priceHeader": {
    message: "Price",
    description: "Table header for price column",
  },
  "journal.quickAdd": {
    message: "Быстрое добавление",
    description: "Button for quick transaction entry",
  },
  "journal.saveFailed": {
    message: "Ошибка сохранения",
    description: "Error message when save fails",
  },
  "journal.saveSuccess": {
    message: "Транзакция сохранена!",
    description: "Success message after saving transaction",
  },
  "journal.selectAccount": {
    message: "Выберите счёт...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "Выберите дату баланса",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "Выберите валюту...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Выберите описание...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "Выберите дату заметки",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "Выберите получателя платежа...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.selectTransactionDate": {
    message: "Выберите дату транзакции",
    description: "Placeholder for date picker",
  },
  "journal.to": {
    message: "Кому",
    description: "Label for destination account in transaction",
  },
  "journal.toggleMetadata": {
    message: "Переключить метаданные",
    description: "Filter tooltip to show/hide metadata",
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
};

export default ruJournal;
