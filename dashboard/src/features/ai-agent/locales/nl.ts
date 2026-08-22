export interface TranslationEntry {
  message: string;
  description: string;
}

const nlAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Vraag Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Vraag me iets over Beancount...",
    description: "Input placeholder text",
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
  "aiAgent.quickAskPlaceholder": {
    message: "Vraag me iets over dit grootboek...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Vragen",
    description: "Button text to submit quick question",
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
  "aiAgent.receiptApproval.title": {
    message: "Bontransactie vastleggen",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "Transactie voorbereiden…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "Transactie vastgelegd",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "Vastleggen van transactie mislukt",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "Datum",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "Begunstigde",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "Bedrag",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "Uitgave",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "Betaling",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "Bestand bijvoegen",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "{fileName} verwijderen",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "mislukt",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "Naar beneden scrollen",
    description: "Aria label for the scroll to bottom button in the chat",
  },
};

export default nlAiAgent;
