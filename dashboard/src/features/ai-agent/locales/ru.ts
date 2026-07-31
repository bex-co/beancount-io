export interface TranslationEntry {
  message: string;
  description: string;
}

const ruAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Спросите Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.subtitle": {
    message: "Помощь с ИИ для вашей главной книги",
    description: "Subtitle for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Спросите меня о Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.send": {
    message: "Отправить",
    description: "Send button text",
  },
  "aiAgent.sending": {
    message: "Отправка...",
    description: "Loading state text",
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
  "aiAgent.you": {
    message: "Вы",
    description: "Label for user messages",
  },
  "aiAgent.assistant": {
    message: "ИИ-Ассистент",
    description: "Label for AI assistant messages",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request создан",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "Посмотреть PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.status.connecting": {
    message: "Думаю...",
    description: "Status badge text when connecting to AI",
  },
  "aiAgent.status.streaming": {
    message: "Потоковая передача...",
    description: "Status badge text when receiving AI response",
  },
  "aiAgent.status.finalizing": {
    message: "Завершение...",
    description: "Status badge text when finalizing AI response",
  },
  "aiAgent.status.complete": {
    message: "Завершено",
    description: "Status badge text when AI response is complete",
  },
  "aiAgent.status.error": {
    message: "Ошибка",
    description: "Status badge text when an error occurs",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Спросите меня о чём-нибудь об этой книге...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Спросить",
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
  "aiAgent.suggestionsTitle": {
    message: "Попробуйте спросить:",
    description:
      "Heading above suggested example questions in the empty chat state",
  },
  "aiAgent.suggestions.diningLastMonth": {
    message: "Сколько я потратил на питание в прошлом месяце?",
    description: "Suggested question: dining spend last month",
  },
  "aiAgent.suggestions.netWorth": {
    message: "Каков мой текущий чистый капитал?",
    description: "Suggested question: current net worth",
  },
  "aiAgent.suggestions.topCategories": {
    message: "Покажи мои 5 крупнейших категорий расходов в этом году",
    description: "Suggested question: top 5 expense categories this year",
  },
  "aiAgent.suggestions.uncategorized": {
    message: "Есть ли у меня некатегоризованные транзакции?",
    description: "Suggested question: uncategorized transactions",
  },
  "aiAgent.suggestions.monthOverMonth": {
    message: "Сравни расходы этого месяца с прошлым",
    description: "Suggested question: compare this month to last month",
  },
  "aiAgent.suggestions.largestExpense": {
    message: "Какая моя самая крупная трата в этом квартале?",
    description: "Suggested question: largest single expense this quarter",
  },
  "aiAgent.stop": {
    message: "Стоп",
    description: "Button to stop an in-flight AI response",
  },
  "aiAgent.stopped": {
    message: "Остановлено",
    description: "Label shown on an AI response the user stopped",
  },
  "aiAgent.retry": {
    message: "Повторить",
    description: "Button to resubmit the last question after an error",
  },
};

export default ruAiAgent;
