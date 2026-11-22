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
  "aiAgent.readOnlyTitle": {
    message: "Alleen-lezen-agent",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "Je kunt vragen stellen en bestanden analyseren. Voor wijzigingen is schrijftoegang nodig, maar ik kan ze voor je opstellen.",
    description: "Explanation shown when the agent cannot change the ledger",
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
  "aiAgent.stop": {
    message: "Stoppen",
    description: "Accessible name for stopping an in-progress AI response",
  },
  "aiAgent.stopped": {
    message: "Generatie gestopt",
    description: "Toast shown after the user stops an in-progress AI response",
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
    message: "Groei",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "Organisatie",
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
    message: "Bewerkingsverzoek",
    description: "Title for the file edit approval card",
  },
  "aiAgent.editApproval.approve": {
    message: "Goedkeuren",
    description: "Button to approve an AI file edit",
  },
  "aiAgent.editApproval.deny": {
    message: "Weigeren",
    description: "Button to deny an AI file edit",
  },
  "aiAgent.editApproval.approved": {
    message: "Goedgekeurd",
    description: "Badge shown after user approved the edit",
  },
  "aiAgent.editApproval.denied": {
    message: "Geweigerd",
    description: "Badge shown after user denied the edit",
  },
  "aiAgent.editApproval.newFile": {
    message: "Nieuw bestand",
    description: "Label in diff block when creating a new file",
  },
  "aiAgent.editApproval.replaceFile": {
    message: "Bestand vervangen",
    description: "Label in diff block when replacing an entire file",
  },
  "aiAgent.editApproval.deleteFile": {
    message: "Bestand verwijderen",
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
  "aiAgent.attachment": {
    message: "bijlage",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.toolList": {
    message: "Lijst",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "Lezen",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "Grootboekcontext controleren",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "{count} bestanden gecontroleerd",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.checkedFiles_one": {
    message: "{count} bestand gecontroleerd",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.checkedFiles_other": {
    message: "{count} bestanden gecontroleerd",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - plural form",
  },
  "aiAgent.ranQueries": {
    message: "{count} zoekopdrachten uitgevoerd",
    description:
      "Summary of queries run by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.ranQueries_one": {
    message: "{count} zoekopdracht uitgevoerd",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.ranQueries_other": {
    message: "{count} zoekopdrachten uitgevoerd",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - plural form",
  },
  "aiAgent.usedTools": {
    message: "{count} hulpmiddelen gebruikt",
    description:
      "Summary of tools used by the AI - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.usedTools_one": {
    message: "{count} hulpmiddel gebruikt",
    description:
      "Summary of tools used by the AI - interpolation: {count} - singular form",
  },
  "aiAgent.usedTools_other": {
    message: "{count} hulpmiddelen gebruikt",
    description:
      "Summary of tools used by the AI - interpolation: {count} - plural form",
  },
  "aiAgent.unknownBlock": {
    message: "Onbekend blok",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "Wijzigingen voorbereiden…",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "{count} bewerkingen toegepast",
    description:
      "Success status for applied AI file operations - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.editApproval.appliedOperations_one": {
    message: "{count} bewerking toegepast",
    description:
      "Success status for applied AI file operations - interpolation: {count} - singular form",
  },
  "aiAgent.editApproval.appliedOperations_other": {
    message: "{count} bewerkingen toegepast",
    description:
      "Success status for applied AI file operations - interpolation: {count} - plural form",
  },
  "aiAgent.editApproval.failed": {
    message: "Bewerken mislukt",
    description: "Fallback error for a failed AI file edit",
  },
};

export default nlAiAgent;
