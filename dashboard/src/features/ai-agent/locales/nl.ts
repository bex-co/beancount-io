export interface TranslationEntry {
  message: string;
  description: string;
}

const nlAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Vraag Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.subtitle": {
    message: "AI-hulp voor jouw grootboek",
    description: "Subtitle for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Vraag me iets over Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.send": {
    message: "Verzenden",
    description: "Send button text",
  },
  "aiAgent.sending": {
    message: "Verzenden...",
    description: "Loading state text",
  },
  "aiAgent.welcome": {
    message:
      "Hallo! Ik ben je Beancount AI-assistent, hier om je te helpen met je platte tekst boekhouden.\n\n" +
      "Ik kan:\n" +
      "• Beancount-syntaxis uitleggen en fouten debuggen\n" +
      "• Je begeleiden bij het schrijven van transacties, rekeningen en richtlijnen\n" +
      "• Boekhoudkundige en administratieve vragen beantwoorden\n" +
      "• Helpen met queries, rapporten en best practices\n\n" +
      "Wat wil je weten?",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.you": {
    message: "Jij",
    description: "Label for user messages",
  },
  "aiAgent.assistant": {
    message: "AI Assistent",
    description: "Label for AI assistant messages",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request aangemaakt",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "Bekijk PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.status.connecting": {
    message: "Denken...",
    description: "Status badge text when connecting to AI",
  },
  "aiAgent.status.streaming": {
    message: "Streamen...",
    description: "Status badge text when receiving AI response",
  },
  "aiAgent.status.finalizing": {
    message: "Afronden...",
    description: "Status badge text when finalizing AI response",
  },
  "aiAgent.status.complete": {
    message: "Voltooid",
    description: "Status badge text when AI response is complete",
  },
  "aiAgent.status.error": {
    message: "Fout",
    description: "Status badge text when an error occurs",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Vraag me iets over dit grootboek...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Vragen",
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
    message: "AI-verzoeken raken op",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "U heeft {used} van {max} verzoeken deze maand gebruikt. Upgrade voor meer.",
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
    message: "/mnd",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count} tokens / maand",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "Populair",
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

export default nlAiAgent;
