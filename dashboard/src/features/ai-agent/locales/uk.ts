export interface TranslationEntry {
  message: string;
  description: string;
}

const ukAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Запитайте Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Запитайте про вашу книгу обліку або додайте чек чи виписку…",
    description: "Input placeholder text",
  },
  "aiAgent.readOnlyTitle": {
    message: "Агент лише для читання",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "Ви можете ставити запитання й аналізувати файли. Для змін потрібен доступ на запис, але я можу підготувати їх для вас.",
    description: "Explanation shown when the agent cannot change the ledger",
  },
  "aiAgent.welcome": {
    message:
      "Привіт! Я ваш AI-асистент Beancount, тут щоб допомогти з вашим текстовим бухгалтерським обліком.\n\n" +
      "Я можу:\n" +
      "• Пояснити синтаксис Beancount і налагодити помилки\n" +
      "• Провести вас через написання транзакцій, рахунків і директив\n" +
      "• Відповісти на бухгалтерські питання та питання обліку\n" +
      "• Допомогти із запитами, звітами та найкращими практиками\n\n" +
      "Що ви хочете дізнатися?",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Запитайте мене про що-небудь про цю книгу...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Запитати",
    description: "Button text to submit quick question",
  },
  "aiAgent.stop": {
    message: "Зупинити",
    description: "Accessible name for stopping an in-progress AI response",
  },
  "aiAgent.stopped": {
    message: "Генерацію зупинено",
    description: "Toast shown after the user stops an in-progress AI response",
  },
  "aiAgent.upgradeTitle": {
    message: "Запити до ШІ закінчуються",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "Ви використали {used} з {max} запитів цього місяця. Оновіть для більшого.",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "Оновити",
    description: "Button text to upgrade plan",
  },
  "aiAgent.premiumTier": {
    message: "Преміум",
    description: "Premium tier name",
  },
  "aiAgent.growthTier": {
    message: "Зростання",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "Організація",
    description: "Organization tier name",
  },
  "aiAgent.perMonth": {
    message: "/міс",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count} токенів / місяць",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "Популярний",
    description: "Badge label for the most popular tier",
  },
  "aiAgent.editApproval.title": {
    message: "Запит на редагування",
    description: "Title for the file edit approval card",
  },
  "aiAgent.editApproval.approve": {
    message: "Схвалити",
    description: "Button to approve an AI file edit",
  },
  "aiAgent.editApproval.deny": {
    message: "Відхилити",
    description: "Button to deny an AI file edit",
  },
  "aiAgent.editApproval.approved": {
    message: "Схвалено",
    description: "Badge shown after user approved the edit",
  },
  "aiAgent.editApproval.denied": {
    message: "Відхилено",
    description: "Badge shown after user denied the edit",
  },
  "aiAgent.editApproval.newFile": {
    message: "Новий файл",
    description: "Label in diff block when creating a new file",
  },
  "aiAgent.editApproval.replaceFile": {
    message: "Заміна файлу",
    description: "Label in diff block when replacing an entire file",
  },
  "aiAgent.editApproval.deleteFile": {
    message: "Видалення файлу",
    description: "Label in diff block when deleting a file",
  },
  "aiAgent.receiptApproval.title": {
    message: "Записати транзакцію за чеком",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "Підготовка транзакції…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "Транзакцію записано",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "Не вдалося записати транзакцію",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "Дата",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "Отримувач",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "Сума",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "Витрата",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "Оплата",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "Прикріпити файл",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "Видалити {fileName}",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "помилка",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "Прокрутити вниз",
    description: "Aria label for the scroll to bottom button in the chat",
  },
  "aiAgent.attachment": {
    message: "вкладення",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.toolList": {
    message: "Список",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "Прочитати",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "Перевірка контексту книги",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "Перевірено {count} файлів",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.checkedFiles_one": {
    message: "Перевірено {count} файл",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.checkedFiles_few": {
    message: "Перевірено {count} файли",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - form for counts like 2-4",
  },
  "aiAgent.checkedFiles_many": {
    message: "Перевірено {count} файлів",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - form for counts like 5-20",
  },
  "aiAgent.checkedFiles_other": {
    message: "Перевірено {count} файлу",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - form for fractional counts",
  },
  "aiAgent.ranQueries": {
    message: "Виконано {count} запитів",
    description:
      "Summary of queries run by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.ranQueries_one": {
    message: "Виконано {count} запит",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.ranQueries_few": {
    message: "Виконано {count} запити",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - form for counts like 2-4",
  },
  "aiAgent.ranQueries_many": {
    message: "Виконано {count} запитів",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - form for counts like 5-20",
  },
  "aiAgent.ranQueries_other": {
    message: "Виконано {count} запиту",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - form for fractional counts",
  },
  "aiAgent.usedTools": {
    message: "Використано {count} інструментів",
    description:
      "Summary of tools used by the AI - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.usedTools_one": {
    message: "Використано {count} інструмент",
    description:
      "Summary of tools used by the AI - interpolation: {count} - singular form",
  },
  "aiAgent.usedTools_few": {
    message: "Використано {count} інструменти",
    description:
      "Summary of tools used by the AI - interpolation: {count} - form for counts like 2-4",
  },
  "aiAgent.usedTools_many": {
    message: "Використано {count} інструментів",
    description:
      "Summary of tools used by the AI - interpolation: {count} - form for counts like 5-20",
  },
  "aiAgent.usedTools_other": {
    message: "Використано {count} інструмента",
    description:
      "Summary of tools used by the AI - interpolation: {count} - form for fractional counts",
  },
  "aiAgent.unknownBlock": {
    message: "Невідомий блок",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "Готуються зміни…",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "Застосовано {count} операцій",
    description:
      "Success status for applied AI file operations - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.editApproval.appliedOperations_one": {
    message: "Застосовано {count} операцію",
    description:
      "Success status for applied AI file operations - interpolation: {count} - singular form",
  },
  "aiAgent.editApproval.appliedOperations_few": {
    message: "Застосовано {count} операції",
    description:
      "Success status for applied AI file operations - interpolation: {count} - form for counts like 2-4",
  },
  "aiAgent.editApproval.appliedOperations_many": {
    message: "Застосовано {count} операцій",
    description:
      "Success status for applied AI file operations - interpolation: {count} - form for counts like 5-20",
  },
  "aiAgent.editApproval.appliedOperations_other": {
    message: "Застосовано {count} операції",
    description:
      "Success status for applied AI file operations - interpolation: {count} - form for fractional counts",
  },
  "aiAgent.editApproval.failed": {
    message: "Помилка редагування",
    description: "Fallback error for a failed AI file edit",
  },
  "aiAgent.starterPromptExpenses": {
    message: "Розібрати витрати за минулий місяць",
    description: "Starter prompt chip asking about top recent expenses",
  },
  "aiAgent.starterPromptNetWorth": {
    message: "Підсумуй динаміку мого чистого капіталу",
    description: "Starter prompt chip asking for a net worth summary",
  },
  "aiAgent.starterPromptAssets": {
    message: "Покажи поточний розподіл моїх активів",
    description: "Starter prompt chip asking for current asset allocation",
  },
  "aiAgent.starterPromptReview": {
    message: "Знайти некатегоризовані або незвичні записи",
    description:
      "Starter prompt chip asking to review uncategorized or unusual entries",
  },
  "aiAgent.attachFormatsHint": {
    message: "PDF, CSV або фото чека",
    description:
      "Short hint beside the attach button showing supported file types",
  },
  "aiAgent.enterToSend": {
    message: "Enter для надсилання",
    description: "Keyboard shortcut hint beside the send button",
  },
  "aiAgent.newChat": {
    message: "Новий чат",
    description: "Button label to reset and start a new AI agent conversation",
  },
  "aiAgent.generating": {
    message: "Генерація…",
    description:
      "Short status label beside the stop button while a response is generating",
  },
  "aiAgent.restorePrompt": {
    message: "Відновити запит",
    description:
      "Button label in error banner to copy the failed message back into the composer",
  },
};

export default ukAiAgent;
