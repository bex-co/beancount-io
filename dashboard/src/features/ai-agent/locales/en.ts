export interface TranslationEntry {
  message: string;
  description: string;
}

const enAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Ask Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.subtitle": {
    message: "AI-powered help for your ledger",
    description: "Subtitle for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Ask me anything about Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.send": {
    message: "Send",
    description: "Send button text",
  },
  "aiAgent.sending": {
    message: "Sending...",
    description: "Loading state text",
  },
  "aiAgent.welcome": {
    message:
      "Hi! I'm your Beancount AI assistant, here to help with your plain-text accounting.\n\n" +
      "I can:\n" +
      "• Explain Beancount syntax and debug errors\n" +
      "• Guide you through writing transactions, accounts, and directives\n" +
      "• Answer accounting and bookkeeping questions\n" +
      "• Help with queries, reports, and best practices\n\n" +
      "What would you like to know?",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.you": {
    message: "You",
    description: "Label for user messages",
  },
  "aiAgent.assistant": {
    message: "AI Assistant",
    description: "Label for AI assistant messages",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request Created",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "View PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.status.connecting": {
    message: "Thinking...",
    description: "Status badge text when connecting to AI",
  },
  "aiAgent.status.streaming": {
    message: "Streaming...",
    description: "Status badge text when receiving AI response",
  },
  "aiAgent.status.finalizing": {
    message: "Finalizing...",
    description: "Status badge text when finalizing AI response",
  },
  "aiAgent.status.complete": {
    message: "Complete",
    description: "Status badge text when AI response is complete",
  },
  "aiAgent.status.error": {
    message: "Error",
    description: "Status badge text when an error occurs",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Ask me anything about this ledger...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Ask",
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
    message: "Running low on AI tokens",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message: "You've used {used} of {max} tokens this month. Upgrade for more.",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "Upgrade",
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
    message: "/mo",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count} tokens / month",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "Popular",
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
    message: "Try asking:",
    description:
      "Heading above suggested example questions in the empty chat state",
  },
  "aiAgent.suggestions.diningLastMonth": {
    message: "How much did I spend on dining last month?",
    description: "Suggested question: dining spend last month",
  },
  "aiAgent.suggestions.netWorth": {
    message: "What's my current net worth?",
    description: "Suggested question: current net worth",
  },
  "aiAgent.suggestions.topCategories": {
    message: "Show my top 5 expense categories this year",
    description: "Suggested question: top 5 expense categories this year",
  },
  "aiAgent.suggestions.uncategorized": {
    message: "Any transactions I haven't categorized?",
    description: "Suggested question: uncategorized transactions",
  },
  "aiAgent.suggestions.monthOverMonth": {
    message: "Compare this month's spending to last month",
    description: "Suggested question: compare this month to last month",
  },
  "aiAgent.suggestions.largestExpense": {
    message: "What's my largest single expense this quarter?",
    description: "Suggested question: largest single expense this quarter",
  },
  "aiAgent.stop": {
    message: "Stop",
    description: "Button to stop an in-flight AI response",
  },
  "aiAgent.stopped": {
    message: "Stopped",
    description: "Label shown on an AI response the user stopped",
  },
  "aiAgent.retry": {
    message: "Retry",
    description: "Button to resubmit the last question after an error",
  },
};

export default enAiAgent;
