export interface TranslationEntry {
  message: string;
  description: string;
}

const bgAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Питай Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.subtitle": {
    message: "AI-помощник за вашата счетоводна книга",
    description: "Subtitle for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Попитайте ме за Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.send": {
    message: "Изпрати",
    description: "Send button text",
  },
  "aiAgent.sending": {
    message: "Изпращане...",
    description: "Loading state text",
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
  "aiAgent.you": {
    message: "Вие",
    description: "Label for user messages",
  },
  "aiAgent.assistant": {
    message: "AI Асистент",
    description: "Label for AI assistant messages",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request създаден",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "Виж PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.status.connecting": {
    message: "Мисля...",
    description: "Status badge text when connecting to AI",
  },
  "aiAgent.status.streaming": {
    message: "Стрийминг...",
    description: "Status badge text when receiving AI response",
  },
  "aiAgent.status.finalizing": {
    message: "Финализиране...",
    description: "Status badge text when finalizing AI response",
  },
  "aiAgent.status.complete": {
    message: "Завършено",
    description: "Status badge text when AI response is complete",
  },
  "aiAgent.status.error": {
    message: "Грешка",
    description: "Status badge text when an error occurs",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Попитайте мене нещо за тази главна книга...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Попитай",
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
    message: "Опитайте да попитате:",
    description:
      "Heading above suggested example questions in the empty chat state",
  },
  "aiAgent.suggestions.diningLastMonth": {
    message: "Колко похарчих за храна миналия месец?",
    description: "Suggested question: dining spend last month",
  },
  "aiAgent.suggestions.netWorth": {
    message: "Какво е текущото ми нетно богатство?",
    description: "Suggested question: current net worth",
  },
  "aiAgent.suggestions.topCategories": {
    message: "Покажи ми топ 5 категории разходи за тази година",
    description: "Suggested question: top 5 expense categories this year",
  },
  "aiAgent.suggestions.uncategorized": {
    message: "Имам ли некатегоризирани транзакции?",
    description: "Suggested question: uncategorized transactions",
  },
  "aiAgent.suggestions.monthOverMonth": {
    message: "Сравни разходите ми този месец с миналия",
    description: "Suggested question: compare this month to last month",
  },
  "aiAgent.suggestions.largestExpense": {
    message: "Кой е най-големият ми единичен разход това тримесечие?",
    description: "Suggested question: largest single expense this quarter",
  },
  "aiAgent.stop": {
    message: "Спри",
    description: "Button to stop an in-flight AI response",
  },
  "aiAgent.stopped": {
    message: "Спрян",
    description: "Label shown on an AI response the user stopped",
  },
  "aiAgent.retry": {
    message: "Опитай отново",
    description: "Button to resubmit the last question after an error",
  },
};

export default bgAiAgent;
