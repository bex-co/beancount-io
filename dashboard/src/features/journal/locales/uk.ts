export interface TranslationEntry {
  message: string;
  description: string;
}

const ukJournal: Record<string, TranslationEntry> = {
  "journal.account": {
    message: "Рахунок",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "Рахунок (e.g., Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Рахунок is required",
    description: "Validation error when account is missing",
  },
  "journal.accounts": {
    message: "Рахунки",
    description: "Plural form of account",
  },
  "journal.addNewJournalEntry": {
    message: "Додати новий запис журналу",
    description: "Aria label for add new journal entry button",
  },
  "journal.amountMustBeNumber": {
    message: "Сума має бути дійсним числом",
    description: "Validation error when amount is not numeric",
  },
  "journal.amountPlaceholder": {
    message: "Сума (напр., 100.00)",
    description: "Placeholder for amount field",
  },
  "journal.amountRequired": {
    message: "Сума обов'язкова",
    description: "Validation error when amount is missing",
  },
  "journal.atLeastTwoPostings": {
    message: "Потрібно щонайменше дві проводки",
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
    message: "Балансs after entry",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Балансs before entry",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "Б",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Бudget entries",
    description: "Filter tooltip for budget entries",
  },
  "journal.change": {
    message: "Зміна",
    description: "Table header for change column in account journal",
  },
  "journal.cleared": {
    message: "*",
    description: "Label for cleared transaction subtype filter",
  },
  "journal.clearedTransactions": {
    message: "Очиститиed transactions",
    description: "Filter tooltip for cleared transactions",
  },
  "journal.close": {
    message: "Закрити",
    description: "Close account entry type filter",
  },
  "journal.createNewJournalEntry": {
    message: "Створити новий запис журналу для цієї книги",
    description: "Dialog description for new entry",
  },
  "journal.createAccountEntry": {
    message: "Створити запис рахунку",
    description:
      "Button text to create an open account entry in the new directive dialog",
  },
  "journal.createBalanceEntry": {
    message: "Створити запис балансу",
    description: "Button text to create balance entry",
  },
  "journal.createNoteEntry": {
    message: "Створити запис нотатки",
    description: "Button text to create note entry",
  },
  "journal.createTransactionEntry": {
    message: "Створити запис транзакції",
    description: "Button text to create transaction entry",
  },
  "journal.currencyPlaceholder": {
    message: "Валюта (напр., USD)",
    description: "Placeholder for currency field",
  },
  "journal.currencyRequired": {
    message: "Валюта обов'язкова",
    description: "Validation error when currency is missing",
  },
  "journal.custom": {
    message: "Власний",
    description: "Custom entry type filter",
  },
  "journal.date": {
    message: "Дата",
    description: "Label for date field",
  },
  "journal.discovered": {
    message: "В",
    description: "Label for discovered document subtype filter",
  },
  "journal.discoveredDocuments": {
    message: "Вiscovered documents",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Вocument",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message: "Вownload currently filtered entries as a Beancount file",
    description: "Description for export journal dialog",
  },
  "journal.entryContext": {
    message: "Контекст запису",
    description: "Dialog title for entry context",
  },
  "journal.entryCreatedSuccess": {
    message: "Запис успішно створено",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Розташування:",
    description: "Label for entry location in file",
  },
  "journal.errorLoadingJournalEntries": {
    message: "Помилка завантаження записів журналу",
    description: "Error message prefix for journal loading failures",
  },
  "journal.export": {
    message: "Експорт",
    description: "Button label to export",
  },
  "journal.exportJournal": {
    message: "Експорт Journal",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Експортing...",
    description: "Button state while exporting",
  },
  "journal.failedToCreateBalance": {
    message: "Не вдалося створити запис балансу",
    description: "Error message when balance entry creation fails",
  },
  "journal.failedToCreateNote": {
    message: "Не вдалося створити запис примітки",
    description: "Error message when note entry creation fails",
  },
  "journal.failedToCreateTransaction": {
    message: "Не вдалося створити транзакцію",
    description: "Error message when transaction creation fails",
  },
  "journal.failedToExportJournal": {
    message: "Не вдалося експортувати журнал",
    description: "Error message when journal export fails",
  },
  "journal.journal": {
    message: "Журнал",
    description: "Navigation label for journal/transaction history page",
  },
  "journal.journalExportedSuccess": {
    message: "Журнал exported successfully",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "П",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Пinked documents",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Пoading entry context...",
    description: "Loading message while fetching entry context",
  },
  "journal.metadata": {
    message: "Метадані",
    description: "Label for metadata toggle filter",
  },
  "journal.narrationPlaceholder": {
    message: "Опис",
    description: "Placeholder for narration field",
  },
  "journal.newEntry": {
    message: "Новий запис",
    description: "Dialog title for creating new journal entry",
  },
  "journal.noCurrenciesFound": {
    message: "Валют не знайдено",
    description: "Message when no currencies match search",
  },
  "journal.noJournalEntriesFound": {
    message: "Записів журналу для поточних фільтрів не знайдено.",
    description: "Message when journal has no entries matching filters",
  },
  "journal.noNarrationsFound": {
    message: "Описів не знайдено",
    description: "Message when no narrations match search",
  },
  "journal.noPayeesFound": {
    message: "Отримувачів не знайдено",
    description: "Message when no payees match search",
  },
  "journal.note": {
    message: "Примітка",
    description: "Note entry type",
  },
  "journal.noteContent": {
    message: "Примітка content",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Примітка content is required",
    description: "Validation error when note content is missing",
  },
  "journal.open": {
    message: "Відкрити",
    description: "Open account entry type filter",
  },
  "journal.other": {
    message: "х",
    description: "Label for other transaction subtype filter",
  },
  "journal.otherTransactions": {
    message: "Інше transactions",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Заповнення",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "Отримувач/Narration",
    description: "Table header for payee and narration column",
  },
  "journal.payeePlaceholder": {
    message: "Отримувач",
    description: "Placeholder for payee field",
  },
  "journal.pending": {
    message: "!",
    description: "Label for pending transaction subtype filter",
  },
  "journal.pendingTransactions": {
    message: "Очікувані транзакції",
    description: "Filter tooltip for pending transactions",
  },
  "journal.postings": {
    message: "Проведення",
    description: "Label for postings toggle filter",
  },
  "journal.price": {
    message: "Ціна",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "Виберіть рахунок...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectBalanceDate": {
    message: "Виберіть дату балансу",
    description: "Placeholder for balance date picker",
  },
  "journal.selectCurrency": {
    message: "Виберіть валюту...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Виберіть опис...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectNoteDate": {
    message: "Виберіть дату примітки",
    description: "Placeholder for note date picker",
  },
  "journal.selectPayee": {
    message: "Виберіть отримувача...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "Комуggle metadata",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "Комуggle postings",
    description: "Filter tooltip to show/hide postings",
  },
  "journal.transaction": {
    message: "Транзакція",
    description: "Singular form of transaction",
  },
  "journal.transactions": {
    message: "Транзакції",
    description: "Plural form of transaction",
  },
  "journal.unitsHeader": {
    message: "Одиниці",
    description: "Table header for units column",
  },
  "journal.unknownDirectiveType": {
    message: "Невідомий тип директиви",
    description: "Message shown for unrecognized beancount directive types",
  },
};

export default ukJournal;
