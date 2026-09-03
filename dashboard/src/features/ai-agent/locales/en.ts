export interface TranslationEntry {
  message: string;
  description: string;
}

const enAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Ask Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Ask me anything about Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.readOnlyTitle": {
    message: "Read-only agent",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "You can ask questions and analyze files. Changes require writer access, but I can draft them for you.",
    description: "Explanation shown when the agent cannot change the ledger",
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
  "aiAgent.quickAskPlaceholder": {
    message: "Ask me anything about this ledger...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Ask",
    description: "Button text to submit quick question",
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
  "aiAgent.receiptApproval.title": {
    message: "Record receipt transaction",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "Preparing transaction…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "Transaction recorded",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "Failed to record transaction",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "Date",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "Payee",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "Amount",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "Expense",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "Payment",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "Attach file",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "Remove {fileName}",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "failed",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "Scroll to bottom",
    description: "Aria label for the scroll to bottom button in the chat",
  },
  "aiAgent.attachment": {
    message: "attachment",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.preparing": {
    message: "Preparing…",
    description: "Status while an AI tool is preparing",
  },
  "aiAgent.toolFailed": {
    message: "{tool} failed",
    description: "Fallback error when an AI tool fails",
  },
  "aiAgent.toolList": {
    message: "List",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "Read",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "Checking ledger context",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "Checked {count} file(s)",
    description: "Summary of files inspected by AI tools",
  },
  "aiAgent.ranQueries": {
    message: "Ran {count} query or queries",
    description: "Summary of queries run by AI tools",
  },
  "aiAgent.usedTools": {
    message: "Used {count} tool(s)",
    description: "Summary of tools used by the AI",
  },
  "aiAgent.unknownBlock": {
    message: "Unknown block",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "Preparing changes…",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "Applied {count} operation(s)",
    description: "Success status for applied AI file operations",
  },
  "aiAgent.editApproval.failed": {
    message: "Edit failed",
    description: "Fallback error for a failed AI file edit",
  },
};

export default enAiAgent;
