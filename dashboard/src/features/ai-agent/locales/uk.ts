export interface TranslationEntry {
  message: string;
  description: string;
}

const ukAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Запитайте Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.subtitle": {
    message: "Допомога зі штучним інтелектом для вашої головної книги",
    description: "Subtitle for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Запитайте мене про Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.send": {
    message: "Надіслати",
    description: "Send button text",
  },
  "aiAgent.sending": {
    message: "Надсилання...",
    description: "Loading state text",
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
  "aiAgent.you": {
    message: "Ви",
    description: "Label for user messages",
  },
  "aiAgent.assistant": {
    message: "AI-Асистент",
    description: "Label for AI assistant messages",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request створено",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "Переглянути PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.status.connecting": {
    message: "Думаю...",
    description: "Status badge text when connecting to AI",
  },
  "aiAgent.status.streaming": {
    message: "Потокова передача...",
    description: "Status badge text when receiving AI response",
  },
  "aiAgent.status.finalizing": {
    message: "Завершення...",
    description: "Status badge text when finalizing AI response",
  },
  "aiAgent.status.complete": {
    message: "Завершено",
    description: "Status badge text when AI response is complete",
  },
  "aiAgent.status.error": {
    message: "Помилка",
    description: "Status badge text when an error occurs",
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
  "aiAgent.editApproval.binaryContent": {
    message: "(binary content)",
    description:
      "Placeholder shown when file content is binary (image, PDF, etc.)",
  },
  "aiAgent.readFile.label": {
    message: "Read",
    description: "Label on the read-file tool step",
  },
  "aiAgent.listFiles.label": {
    message: "List",
    description: "Label on the list-files tool step",
  },
};

export default ukAiAgent;
