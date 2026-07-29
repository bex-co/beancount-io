export interface TranslationEntry {
  message: string;
  description: string;
}

const deAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Frag Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.subtitle": {
    message: "KI-gestützte Hilfe für dein Hauptbuch",
    description: "Subtitle for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Frag mich alles über Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.send": {
    message: "Senden",
    description: "Send button text",
  },
  "aiAgent.sending": {
    message: "Wird gesendet...",
    description: "Loading state text",
  },
  "aiAgent.welcome": {
    message:
      "Hallo! Ich bin dein Beancount KI-Assistent und helfe dir bei deiner Textbuchhaltung.\n\n" +
      "Ich kann:\n" +
      "• Beancount-Syntax erklären und Fehler debuggen\n" +
      "• Dich beim Schreiben von Transaktionen, Konten und Direktiven anleiten\n" +
      "• Buchhaltungs- und Buchführungsfragen beantworten\n" +
      "• Bei Abfragen, Berichten und Best Practices helfen\n\n" +
      "Was möchtest du wissen?",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.you": {
    message: "Du",
    description: "Label for user messages",
  },
  "aiAgent.assistant": {
    message: "KI-Assistent",
    description: "Label for AI assistant messages",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request erstellt",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "PR #ansehen",
    description: "Link text to view pull request",
  },
  "aiAgent.status.connecting": {
    message: "Denkt nach...",
    description: "Status badge text when connecting to AI",
  },
  "aiAgent.status.streaming": {
    message: "Streaming...",
    description: "Status badge text when receiving AI response",
  },
  "aiAgent.status.finalizing": {
    message: "Abschließen...",
    description: "Status badge text when finalizing AI response",
  },
  "aiAgent.status.complete": {
    message: "Abgeschlossen",
    description: "Status badge text when AI response is complete",
  },
  "aiAgent.status.error": {
    message: "Fehler",
    description: "Status badge text when an error occurs",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Frag mich etwas über dieses Hauptbuch...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Fragen",
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
    message: "KI-Anfragen werden knapp",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "Sie haben {used} von {max} Anfragen diesen Monat verwendet. Upgraden Sie für mehr.",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "Upgraden",
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
    message: "/Mo.",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count} tokens / Monat",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "Beliebt",
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

export default deAiAgent;
