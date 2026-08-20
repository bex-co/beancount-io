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
  "aiAgent.prCreated": {
    message: "✓ Pull Request створено",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "Переглянути PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Запитайте мене про що-небудь про цю книгу...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Запитати",
    description: "Button text to submit quick question",
  },
  "aiAgent.limitReached": {
    message:
      "You've reached your monthly AI token limit ({max} tokens). Please upgrade your plan for more AI tokens, or wait until next month.",
    description: "Message when user hits AI CFO monthly limit",
  },
  "aiAgent.serviceUnavailable": {
    message:
      "The AI service is temporarily unavailable. Please try again in a few minutes.",
    description:
      "Message when AI CFO service is down or usage check fails (503)",
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
  "aiAgent.suggestionsTitle": {
    message: "Спробуйте запитати:",
    description:
      "Heading above suggested example questions in the empty chat state",
  },
  "aiAgent.suggestions.diningLastMonth": {
    message: "Скільки я витратив на харчування минулого місяця?",
    description: "Suggested question: dining spend last month",
  },
  "aiAgent.suggestions.netWorth": {
    message: "Який мій поточний чистий капітал?",
    description: "Suggested question: current net worth",
  },
  "aiAgent.suggestions.topCategories": {
    message: "Покажи мої 5 найбільших категорій витрат цього року",
    description: "Suggested question: top 5 expense categories this year",
  },
  "aiAgent.suggestions.uncategorized": {
    message: "Чи є в мене нерозподілені транзакції?",
    description: "Suggested question: uncategorized transactions",
  },
  "aiAgent.suggestions.monthOverMonth": {
    message: "Порівняй витрати цього місяця з минулим",
    description: "Suggested question: compare this month to last month",
  },
  "aiAgent.suggestions.largestExpense": {
    message: "Яка моя найбільша окрема витрата цього кварталу?",
    description: "Suggested question: largest single expense this quarter",
  },
  "aiAgent.stop": {
    message: "Стоп",
    description: "Button to stop an in-flight AI response",
  },
  "aiAgent.stopped": {
    message: "Зупинено",
    description: "Label shown on an AI response the user stopped",
  },
  "aiAgent.answeredIn": {
    message: "Відповідь за {duration}",
    description:
      "Shown under a completed AI answer; {duration} is a formatted elapsed time like 12.3s or 1m 5s",
  },
  "aiAgent.retry": {
    message: "Повторити",
    description: "Button to resubmit the last question after an error",
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
