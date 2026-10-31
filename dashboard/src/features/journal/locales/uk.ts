export interface TranslationEntry {
  message: string;
  description: string;
}

const ukJournal: Record<string, TranslationEntry> = {
  "journal.openEntryWithContext": {
    message: "Відкрити запис {entry} (рядок {position})",
    description:
      "Accessible name for opening Entry Context, including the entry identity and row position",
  },
  "journal.showEntryPostings_one": {
    message: "Показати {count} проведення для {entry} (рядок {position})",
    description:
      "Accessible name for revealing this row's postings, including their count and entry identity",
  },
  "journal.showEntryPostings_few": {
    message: "Показати {count} проведення для {entry} (рядок {position})",
    description:
      "Accessible name for revealing this row's postings, including their count and entry identity",
  },
  "journal.showEntryPostings_many": {
    message: "Показати {count} проведень для {entry} (рядок {position})",
    description:
      "Accessible name for revealing this row's postings, including their count and entry identity",
  },
  "journal.showEntryPostings_other": {
    message: "Показати {count} проведення для {entry} (рядок {position})",
    description:
      "Accessible name for revealing this row's postings, including their count and entry identity",
  },
  "journal.hideEntryPostings_one": {
    message: "Сховати {count} проведення для {entry} (рядок {position})",
    description:
      "Accessible name for hiding this row's postings, including their count and entry identity",
  },
  "journal.hideEntryPostings_few": {
    message: "Сховати {count} проведення для {entry} (рядок {position})",
    description:
      "Accessible name for hiding this row's postings, including their count and entry identity",
  },
  "journal.hideEntryPostings_many": {
    message: "Сховати {count} проведень для {entry} (рядок {position})",
    description:
      "Accessible name for hiding this row's postings, including their count and entry identity",
  },
  "journal.hideEntryPostings_other": {
    message: "Сховати {count} проведення для {entry} (рядок {position})",
    description:
      "Accessible name for hiding this row's postings, including their count and entry identity",
  },
  "journal.visibleEntryPostings_one": {
    message: "Показано {count} проведення для {entry} (рядок {position})",
    description:
      "Accessible name for the static posting count when all rows are forced open",
  },
  "journal.visibleEntryPostings_few": {
    message: "Показано {count} проведення для {entry} (рядок {position})",
    description:
      "Accessible name for the static posting count when all rows are forced open",
  },
  "journal.visibleEntryPostings_many": {
    message: "Показано {count} проведень для {entry} (рядок {position})",
    description:
      "Accessible name for the static posting count when all rows are forced open",
  },
  "journal.visibleEntryPostings_other": {
    message: "Показано {count} проведення для {entry} (рядок {position})",
    description:
      "Accessible name for the static posting count when all rows are forced open",
  },
  "journal.account": {
    message: "Рахунок",
    description: "Singular form of account, used as tab label",
  },
  "journal.accountPlaceholder": {
    message: "Рахунок (напр., Assets:Bank:Checking)",
    description: "Placeholder for account field",
  },
  "journal.accountRequired": {
    message: "Рахунок обов'язковий",
    description: "Validation error when account is missing",
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
    message: "Баланси після запису",
    description: "Section header showing account balances after transaction",
  },
  "journal.balancesBeforeEntry": {
    message: "Баланси до запису",
    description: "Section header showing account balances before transaction",
  },
  "journal.budget": {
    message: "Б",
    description: "Label for budget custom subtype filter",
  },
  "journal.budgetEntries": {
    message: "Записи бюджету",
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
    message: "Проведені транзакції",
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
  "journal.commodity": {
    message: "Товар",
    description: "Name of the Commodity directive type",
  },
  "journal.event": {
    message: "Подія",
    description: "Name of the Event directive type",
  },
  "journal.query": {
    message: "Запит",
    description: "Name of the Query directive type",
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
    message: "Виявлені документи",
    description: "Filter tooltip for discovered documents",
  },
  "journal.document": {
    message: "Документ",
    description: "Document entry type filter",
  },
  "journal.downloadFilteredEntries": {
    message:
      "Завантажує вихідні транзакції та перевірки балансу, обмежені вибраною датою, рахунком і пошуковим виразом. Фільтри типу запису та статусу транзакції не застосовуються.",
    description: "Honest scope for the plaintext journal export dialog",
  },
  "journal.entryContext": {
    message: "Контекст запису",
    description: "Dialog title for entry context",
  },
  "journal.entryContextDescription": {
    message: "Джерело та розташування у файлі для {entry}.",
    description:
      "Screen-reader description of the entry context dialog; {entry} is the entry's date, payee and narration",
  },
  "journal.entryCreatedSuccess": {
    message: "Запис успішно створено",
    description: "Success message after creating entry",
  },
  "journal.entryLocation": {
    message: "Розташування:",
    description: "Label for entry location in file",
  },
  "journal.entryLocationUnavailable": {
    message: "Розташування джерела недоступне",
    description:
      "Показується, коли в контексті запису немає файлу/рядка для переходу",
  },
  "journal.openEntrySource": {
    message: "Відкрити джерело в {location}",
    description: "Accessible name for the entry source location control",
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
    message: "Експорт журналу",
    description: "Dialog title for exporting journal",
  },
  "journal.exporting": {
    message: "Експортування...",
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
  "journal.flag": {
    message: "Прапорець",
    description: "Accessible name for the journal flag column",
  },
  "journal.flagAbbrev": {
    message: "F",
    description: "Short label shown in the journal flag column header",
  },
  "journal.notBooked": {
    message: "Не проведена, не враховується",
    description:
      "Badge on a journal transaction the ledger could not book (for example a sale with no matching lot): it is listed so it can be fixed, but no balance counts it",
  },
  "journal.accountJournalTable": {
    message: "Журнал рахунку",
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
    message: "Журнал успішно експортовано",
    description: "Success message after exporting journal",
  },
  "journal.linked": {
    message: "П",
    description: "Label for linked document subtype filter",
  },
  "journal.linkedDocuments": {
    message: "Пов'язані документи",
    description: "Filter tooltip for linked documents",
  },
  "journal.loadingEntryContext": {
    message: "Завантаження контексту запису...",
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
    message: "Вміст примітки",
    description: "Placeholder for note content field",
  },
  "journal.noteContentRequired": {
    message: "Вміст примітки обов'язковий",
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
    message: "Інші транзакції",
    description: "Filter tooltip for other transactions",
  },
  "journal.pad": {
    message: "Заповнення",
    description: "Pad entry type filter",
  },
  "journal.payeeNarration": {
    message: "Отримувач/Опис",
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
  "journal.postingCost": {
    message: "Собівартість",
    description:
      "Label for the unit lot cost in expanded journal posting details",
  },
  "journal.price": {
    message: "Ціна",
    description: "Price entry type filter",
  },
  "journal.selectAccount": {
    message: "Виберіть рахунок...",
    description: "Placeholder for account selection combobox",
  },
  "journal.selectCurrency": {
    message: "Виберіть валюту...",
    description: "Placeholder for currency selection combobox",
  },
  "journal.selectNarration": {
    message: "Виберіть опис...",
    description: "Placeholder for narration selection combobox",
  },
  "journal.selectPayee": {
    message: "Виберіть отримувача...",
    description: "Placeholder for payee selection combobox",
  },
  "journal.toggleMetadata": {
    message: "Перемкнути метадані",
    description: "Filter tooltip to show/hide metadata",
  },
  "journal.togglePostings": {
    message: "Перемкнути проведення",
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
  "journal.sourceModified": {
    message: "Джерело змінено",
    description: "Notice that entry source has unsaved changes",
  },
  "journal.entrySavedSuccess": {
    message: "Запис успішно збережено",
    description: "Toast shown after saving an entry",
  },
  "journal.entryDeleteTitle": {
    message: "Видалити запис",
    description: "Dialog title for the entry deletion confirmation",
  },
  "journal.entryDeleteDescription": {
    message:
      "Видалити запис у {location}? Його буде вилучено з книги, і цю дію не можна скасувати в застосунку.",
    description:
      "Confirmation message for deleting a journal entry. {location} is replaced with the entry's source location.",
  },
  "journal.entryDeleteConfirm": {
    message: "Видалити запис",
    description: "Confirm button label in the entry deletion confirmation",
  },
  "journal.entryDeleteCancel": {
    message: "Скасувати",
    description: "Cancel button label in the entry deletion confirmation",
  },
  "journal.entryDeletedSuccess": {
    message: "Запис успішно видалено",
    description: "Toast shown after deleting an entry",
  },
  "journal.noEntryContext": {
    message: "Немає даних про контекст запису",
    description: "Empty state for entry context",
  },
  "journal.accumulated": {
    message: "накопичено",
    description: "Label before an accumulated balance difference",
  },
  "journal.fromAccount": {
    message: "від",
    description: "Label before a pad source account",
  },
  "journal.clearedStatus": {
    message: "Очищено",
    description: "Cleared transaction status",
  },
  "journal.pendingStatus": {
    message: "Очікує на розгляд",
    description: "Pending transaction status",
  },
  "journal.addPosting": {
    message: "Додати проводку",
    description: "Accessible name for adding a transaction posting row",
  },
  "journal.removePosting": {
    message: "Видалити проводку {number}",
    description:
      "Accessible name for removing a numbered transaction posting row",
  },
  "journal.payee": {
    message: "Отримувач",
    description: "Label for the payee field",
  },
  "journal.accountLabel": {
    message: "Рахунок",
    description: "Label for the account field of a directive form",
  },
  "journal.amountLabel": {
    message: "Сума",
    description: "Label for the amount field of a directive form",
  },
  "journal.currencyLabel": {
    message: "Валюта",
    description: "Label for the currency field of a directive form",
  },
  "journal.postingAccount": {
    message: "Рахунок проводки {number}",
    description:
      "Accessible label for a numbered transaction posting's account field",
  },
  "journal.postingAmount": {
    message: "Сума проводки {number}",
    description:
      "Accessible label for a numbered transaction posting's amount field",
  },
  "journal.postingCurrency": {
    message: "Валюта проводки {number}",
    description:
      "Accessible label for a numbered transaction posting's currency field",
  },
  "journal.postingsUnbalanced": {
    message:
      "Проводки не збалансовані: залишок {residual}. Змініть суму або очистьте одну, щоб її було розраховано автоматично.",
    description:
      "Shown when a new transaction's postings leave a residual; {residual} is the amount and currency, e.g. 1 USD",
  },
  "journal.accountNotOpen": {
    message: "Рахунок {account} не відкрито в цій книзі.",
    description:
      "Shown under a New Entry account field naming an account the ledger never opened; {account} is the name",
  },
  "journal.alsoOpenAccount": {
    message: "Також відкрити {account} {date}",
    description:
      "Checkbox label that adds an open directive for {account} dated {date} to the same New Entry write",
  },
  "journal.accountClosedBefore": {
    message: "Рахунок {account} закрито {date}, до цього запису.",
    description:
      "Shown under a New Entry account field naming an account closed before the entry; {date} is its close date",
  },
  "journal.accountOpensAfter": {
    message: "Рахунок {account} відкривається {date}, після цього запису.",
    description:
      "Shown under a New Entry account field naming an account opened after the entry; {date} is its open date",
  },
  "journal.discardEntryEditTitle": {
    message: "Скасувати редагування?",
    description:
      "Title of the confirmation shown when leaving Entry Context with unsaved source edits",
  },
  "journal.discardEntryEditDescription": {
    message: "Зміни вихідного тексту цього запису не збережено.",
    description: "Body of the Entry Context discard confirmation",
  },
  "journal.keepEditing": {
    message: "Продовжити редагування",
    description:
      "Button that returns to the Entry Context editor with the edit intact",
  },
  "journal.discardEntryEdit": {
    message: "Скасувати",
    description: "Button that discards the Entry Context edit and leaves",
  },
  "journal.entryChangedElsewhere": {
    message:
      "Цей запис змінено або видалено відтоді, як ви його відкрили, тому редагування не збережено. Скопіюйте редагування та перезавантажте, щоб побачити останню версію.",
    description:
      "Entry Context save refused because the entry changed elsewhere since it was opened",
  },
  "journal.copyMyEdit": {
    message: "Скопіювати моє редагування",
    description: "Copies the unsaved Entry Context edit to the clipboard",
  },
  "journal.reloadEntries": {
    message: "Перезавантажити",
    description:
      "Closes Entry Context and refreshes the journal to show the latest entries",
  },
  "journal.autoAmount": {
    message: "авто",
    description: "Label for an automatically balanced amount",
  },
  "journal.generatedEntryTitle": {
    message: "Згенерований запис",
    description:
      "Heading for the read-only panel shown for a generated (padding) entry",
  },
  "journal.generatedConversionExplanation": {
    message:
      "Це перетворення створено, щоб закрити залишкове сальдо собівартості в журналі, обмеженому за часом, тож у нього немає вихідного рядка для перегляду, редагування чи видалення.",
    description:
      "Explains that a generated conversion entry has no editable source directive",
  },
  "journal.generatedEntryExplanation": {
    message:
      "Beancount створив цей запис із директиви pad, тому він не має вихідного рядка для перегляду, редагування чи видалення.",
    description:
      "Explains that a generated padding entry has no editable source directive",
  },
  "journal.generatedOpeningExplanation": {
    message:
      "Це початкове сальдо створено під час обмеження журналу рахунку часовим діапазоном, тож у нього немає вихідного рядка для перегляду, редагування чи видалення.",
    description:
      "Explains that a generated opening-balance entry has no editable source directive",
  },
  "journal.narration": {
    message: "Опис",
    description: "Label for narration field",
  },

  "journal.backToJournal": {
    message: "Назад до журналу",
    description: "Link from the entry page back to the ledger journal",
  },
  "journal.entryPageTitle": {
    message: "Запис",
    description: "Entry page heading for a shared ledger entry URL",
  },
  "journal.entryPageDescription": {
    message: "Вихідний контекст запису в {ledgerName}.",
    description:
      "Entry page description; {ledgerName} is the ledger display name",
  },
  "journal.managedPriceEntryExplanation": {
    message:
      "Ця ціна надходить із керованого джерела {source}. Вона оновлюється автоматично й не може бути змінена чи видалена тут; щоб замінити її, додайте власний запис ціни на цю дату.",
    description:
      "Shown on a price entry that comes from a managed price include. {source} is the feed URL.",
  },
  "journal.pluginCopyExplanation": {
    message:
      "Плагін створив цей запис з іншого, тому його не можна змінити чи видалити тут. Змініть натомість вихідний запис.",
    description:
      "Shown on an entry a plugin generated as a copy of another one.",
  },
  "journal.openSourceEntry": {
    message: "Відкрити вихідний запис",
    description: "Link from a plugin copy to the entry it was made from.",
  },
};

export default ukJournal;
