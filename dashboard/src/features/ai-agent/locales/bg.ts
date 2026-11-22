export interface TranslationEntry {
  message: string;
  description: string;
}

const bgAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Питай Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Попитайте ме за Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.readOnlyTitle": {
    message: "Асистент само за четене",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "Можете да задавате въпроси и да анализирате файлове. Промените изискват права за запис, но мога да ги подготвя за вас.",
    description: "Explanation shown when the agent cannot change the ledger",
  },
  "aiAgent.welcome": {
    message:
      "Здравейте! Аз съм вашият Beancount AI асистент, тук съм да помогна с вашето текстово счетоводство.\n\n" +
      "Мога да:\n" +
      "• Обяснявам синтаксиса на Beancount и дебъгвам грешки\n" +
      "• Ви водя през писането на транзакции, сметки и директиви\n" +
      "• Отговарям на счетоводни и финансови въпроси\n" +
      "• Помагам с заявки, отчети и добри практики\n\n" +
      "Какво искате да знаете?",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Попитайте мене нещо за тази главна книга...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Попитай",
    description: "Button text to submit quick question",
  },
  "aiAgent.stop": {
    message: "Стоп",
    description: "Accessible name for stopping an in-progress AI response",
  },
  "aiAgent.stopped": {
    message: "Генерирането е спряно",
    description: "Toast shown after the user stops an in-progress AI response",
  },
  "aiAgent.upgradeTitle": {
    message: "AI заявките свършват",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "Използвали сте {used} от {max} заявки този месец. Надградете за повече.",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "Надградете",
    description: "Button text to upgrade plan",
  },
  "aiAgent.premiumTier": {
    message: "Премиум",
    description: "Premium tier name",
  },
  "aiAgent.growthTier": {
    message: "Растеж",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "Организация",
    description: "Organization tier name",
  },
  "aiAgent.perMonth": {
    message: "/мес.",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count} tokens / месец",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "Популярен",
    description: "Badge label for the most popular tier",
  },
  "aiAgent.editApproval.title": {
    message: "Заявка за редакция",
    description: "Title for the file edit approval card",
  },
  "aiAgent.editApproval.approve": {
    message: "Одобри",
    description: "Button to approve an AI file edit",
  },
  "aiAgent.editApproval.deny": {
    message: "Откажи",
    description: "Button to deny an AI file edit",
  },
  "aiAgent.editApproval.approved": {
    message: "Одобрено",
    description: "Badge shown after user approved the edit",
  },
  "aiAgent.editApproval.denied": {
    message: "Отказано",
    description: "Badge shown after user denied the edit",
  },
  "aiAgent.editApproval.newFile": {
    message: "Нов файл",
    description: "Label in diff block when creating a new file",
  },
  "aiAgent.editApproval.replaceFile": {
    message: "Замяна на файла",
    description: "Label in diff block when replacing an entire file",
  },
  "aiAgent.editApproval.deleteFile": {
    message: "Изтриване на файла",
    description: "Label in diff block when deleting a file",
  },
  "aiAgent.receiptApproval.title": {
    message: "Записване на транзакция от касова бележка",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "Подготвяне на транзакцията…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "Транзакцията е записана",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "Неуспешно записване на транзакцията",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "Дата",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "Получател",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "Сума",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "Разход",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "Плащане",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "Прикачване на файл",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "Премахване на {fileName}",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "неуспешно",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "Превъртане до края",
    description: "Aria label for the scroll to bottom button in the chat",
  },
  "aiAgent.attachment": {
    message: "прикачен файл",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.toolList": {
    message: "Списък",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "Прочетете",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "Проверка на контекста на счетоводната книга",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "Проверени {count} файла",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.checkedFiles_one": {
    message: "Проверен {count} файл",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.checkedFiles_other": {
    message: "Проверени {count} файла",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - plural form",
  },
  "aiAgent.ranQueries": {
    message: "Изпълнени {count} заявки",
    description:
      "Summary of queries run by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.ranQueries_one": {
    message: "Изпълнена {count} заявка",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.ranQueries_other": {
    message: "Изпълнени {count} заявки",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - plural form",
  },
  "aiAgent.usedTools": {
    message: "Използвани {count} инструмента",
    description:
      "Summary of tools used by the AI - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.usedTools_one": {
    message: "Използван {count} инструмент",
    description:
      "Summary of tools used by the AI - interpolation: {count} - singular form",
  },
  "aiAgent.usedTools_other": {
    message: "Използвани {count} инструмента",
    description:
      "Summary of tools used by the AI - interpolation: {count} - plural form",
  },
  "aiAgent.unknownBlock": {
    message: "Неизвестен блок",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "Подготвят се промени...",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "Приложени {count} операции",
    description:
      "Success status for applied AI file operations - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.editApproval.appliedOperations_one": {
    message: "Приложена {count} операция",
    description:
      "Success status for applied AI file operations - interpolation: {count} - singular form",
  },
  "aiAgent.editApproval.appliedOperations_other": {
    message: "Приложени {count} операции",
    description:
      "Success status for applied AI file operations - interpolation: {count} - plural form",
  },
  "aiAgent.editApproval.failed": {
    message: "Неуспешна редакция",
    description: "Fallback error for a failed AI file edit",
  },
  "aiAgent.starterPromptExpenses": {
    message: "Кои бяха най-големите ми разходи миналия месец?",
    description: "Starter prompt chip asking about top recent expenses",
  },
  "aiAgent.starterPromptNetWorth": {
    message: "Обобщи тенденцията на нетната ми стойност",
    description: "Starter prompt chip asking for a net worth summary",
  },
  "aiAgent.starterPromptAssets": {
    message: "Покажи текущото разпределение на активите ми",
    description: "Starter prompt chip asking for current asset allocation",
  },
  "aiAgent.starterPromptReview": {
    message: "Провери за некатегоризирани или необичайни записи",
    description:
      "Starter prompt chip asking to review uncategorized or unusual entries",
  },
};

export default bgAiAgent;
