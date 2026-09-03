export interface TranslationEntry {
  message: string;
  description: string;
}

const ruAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Спросите Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Спросите меня о Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.readOnlyTitle": {
    message: "Агент только для чтения",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "Вы можете задавать вопросы и анализировать файлы. Для изменений нужен доступ на запись, но я могу подготовить их для вас.",
    description: "Explanation shown when the agent cannot change the ledger",
  },
  "aiAgent.welcome": {
    message:
      "Здравствуйте! Я ваш ИИ-ассистент Beancount, помогаю вам с бухгалтерией в текстовом формате.\n\n" +
      "Я могу:\n" +
      "• Объяснить синтаксис Beancount и отладить ошибки\n" +
      "• Помочь в написании транзакций, счетов и директив\n" +
      "• Ответить на вопросы по бухгалтерии и учёту\n" +
      "• Помочь с запросами, отчётами и лучшими практиками\n\n" +
      "Что вы хотите узнать?",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Спросите меня о чём-нибудь об этой книге...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Спросить",
    description: "Button text to submit quick question",
  },
  "aiAgent.upgradeTitle": {
    message: "Запросы к ИИ заканчиваются",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "Вы использовали {used} из {max} запросов в этом месяце. Обновите план для большего.",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "Обновить",
    description: "Button text to upgrade plan",
  },
  "aiAgent.premiumTier": {
    message: "Premium",
    description: "Premium tier name",
  },
  "aiAgent.growthTier": {
    message: "Growth",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "Organization",
    description: "Organization tier name",
  },
  "aiAgent.perMonth": {
    message: "/мес",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count} токенов / месяц",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "Популярный",
    description: "Badge label for the most popular tier",
  },
  "aiAgent.editApproval.title": {
    message: "Edit Request",
    description: "Title for the file edit approval card",
  },
  "aiAgent.editApproval.approve": {
    message: "Approve",
    description: "Button to approve an AI file edit",
  },
  "aiAgent.editApproval.deny": {
    message: "Deny",
    description: "Button to deny an AI file edit",
  },
  "aiAgent.editApproval.approved": {
    message: "Approved",
    description: "Badge shown after user approved the edit",
  },
  "aiAgent.editApproval.denied": {
    message: "Denied",
    description: "Badge shown after user denied the edit",
  },
  "aiAgent.editApproval.newFile": {
    message: "New file",
    description: "Label in diff block when creating a new file",
  },
  "aiAgent.editApproval.replaceFile": {
    message: "Replace file",
    description: "Label in diff block when replacing an entire file",
  },
  "aiAgent.editApproval.deleteFile": {
    message: "Delete file",
    description: "Label in diff block when deleting a file",
  },
  "aiAgent.receiptApproval.title": {
    message: "Записать транзакцию по чеку",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "Подготовка транзакции…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "Транзакция записана",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "Не удалось записать транзакцию",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "Дата",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "Получатель",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "Сумма",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "Расход",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "Оплата",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "Прикрепить файл",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "Удалить {fileName}",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "ошибка",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "Прокрутить вниз",
    description: "Aria label for the scroll to bottom button in the chat",
  },
  "aiAgent.attachment": {
    message: "вложение",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.preparing": {
    message: "Подготовка…",
    description: "Status while an AI tool is preparing",
  },
  "aiAgent.toolFailed": {
    message: "{tool} не удалось",
    description: "Fallback error when an AI tool fails",
  },
  "aiAgent.toolList": {
    message: "Список",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "Читать",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "Проверка контекста реестра",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "Проверено {count} файлов",
    description: "Summary of files inspected by AI tools",
  },
  "aiAgent.ranQueries": {
    message: "Выполнил запрос или запросы {count}",
    description: "Summary of queries run by AI tools",
  },
  "aiAgent.usedTools": {
    message: "Использовано {count} инструментов",
    description: "Summary of tools used by the AI",
  },
  "aiAgent.unknownBlock": {
    message: "Неизвестный блок",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "Готовимся к изменениям…",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "Применено {count} операций(й)",
    description: "Success status for applied AI file operations",
  },
  "aiAgent.editApproval.failed": {
    message: "Не удалось изменить",
    description: "Fallback error for a failed AI file edit",
  },
};

export default ruAiAgent;
