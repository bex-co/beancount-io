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
    message: "Запитайте мене про Beancount...",
    description: "Input placeholder text",
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
};

export default ukAiAgent;
