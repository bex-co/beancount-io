export interface TranslationEntry {
  message: string;
  description: string;
}

const bgJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Сметка",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "Сметка (напр., Активи:Банка:Разплащателна)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Сметката е задължителна",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "Сметки",
    description: "Plural form of account",
  },
  "journal.addNewJournalEntry": {
    message: "Добавяне на нов запис в журнала",
    description: "Aria label for add new journal entry button",
  },
  "journal.amountMustBeNumber": {
    message: "Сумата трябва да бъде валидно число",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "Сума (напр., 100.00)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "Сумата е задължителна",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastTwoPostings": {
    message: "Изискват се поне две проводки",
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
    message: "Баланси след записа",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Баланси преди записа",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "Б",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Бюджетни записи",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "Промяна",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "Приключени транзакции",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "Затваряне",
    description: "Close account entry type filter",
  },
  "journal.createNewJournalEntry": {
    message: "Създаване на нов запис в журнала за тази книга",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "Създаване на запис за сметка",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "Създаване на запис за баланс",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "Създаване на запис за бележка",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "Създаване на запис за транзакция",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "Валута (напр., USD)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "Валутата е задължителна",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "Потребителски",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "Дата",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "О",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "Открити документи",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Документ",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message: "Изтегляне на текущо филтрираните записи като Beancount файл",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "Контекст на запис",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "Записът е създаден успешно",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Местоположение:",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "Грешка при зареждане на записите в журнала",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "Експорт",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "Експорт на журнал",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Експортиране...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "Неуспешно създаване на запис за баланс",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "Неуспешно създаване на запис за бележка",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "Неуспешно създаване на транзакция",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "Неуспешен експорт на журнал",
    description: "Error message when journal export fails",
  },
  "journal.journal": {
    message: "Журнал",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Журналът е експортиран успешно",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "С",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Свързани документи",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Зареждане на контекста на запис...",
    description: "Loading message while fetching entry context",
  },
  "journal.metadata": {
    message: "Метаданни",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "Описание",
    description: "Placeholder for narration field",
  },
  "journal.newEntry": {
    message: "Нов запис",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "Няма намерени валути",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "Няма намерени записи в журнала за текущите филтри.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noNarrationsFound": {
    message: "Няма намерени описания",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "Няма намерени получатели",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "Бележка",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "Съдържание на бележката",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Съдържанието на бележката е задължително",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "Отваряне",
    description: "Open account entry type filter",
  },
  "journal.other": {
    message: "д",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "Други транзакции",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Попълване",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "Получател/Описание",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Получател",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Висящи транзакции",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "Публикации",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Цена",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "Изберете сметка...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "Изберете дата за баланс",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "Изберете валута...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Изберете описание...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "Изберете дата за бележка",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "Изберете получател...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "Превключване на метаданни",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "Превключване на проводки",
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
    message: "Единици",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "Неизвестен тип директива",
    description: "Message shown for unrecognized beancount directive types",
  },
};

export default bgJournal;
