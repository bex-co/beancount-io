export interface TranslationEntry {
  message: string;
  description: string;
}

const deAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Frag Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Frag mich alles über Beancount...",
    description: "Input placeholder text",
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
  "aiAgent.quickAskPlaceholder": {
    message: "Frag mich etwas über dieses Hauptbuch...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Fragen",
    description: "Button text to submit quick question",
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
  "aiAgent.receiptApproval.title": {
    message: "Beleg-Transaktion erfassen",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "Transaktion wird vorbereitet…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "Transaktion erfasst",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "Transaktion konnte nicht erfasst werden",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "Datum",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "Zahlungsempfänger",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "Betrag",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "Ausgabe",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "Zahlung",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "Datei anhängen",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "{fileName} entfernen",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "fehlgeschlagen",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "Nach unten scrollen",
    description: "Aria label for the scroll to bottom button in the chat",
  },
  "aiAgent.attachment": {
    message: "Anhang",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.preparing": {
    message: "Vorbereiten…",
    description: "Status while an AI tool is preparing",
  },
  "aiAgent.toolFailed": {
    message: "{tool} fehlgeschlagen",
    description: "Fallback error when an AI tool fails",
  },
  "aiAgent.toolList": {
    message: "Liste",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "Lesen",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "Hauptbuchkontext wird überprüft",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "{count} Datei(en) überprüft",
    description: "Summary of files inspected by AI tools",
  },
  "aiAgent.ranQueries": {
    message: "{count} Abfrage(n) ausgeführt",
    description: "Summary of queries run by AI tools",
  },
  "aiAgent.usedTools": {
    message: "Gebrauchte {count} Werkzeug(e)",
    description: "Summary of tools used by the AI",
  },
  "aiAgent.unknownBlock": {
    message: "Unbekannter Block",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "Änderungen vorbereiten…",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "Angewandte {count} Operation(en)",
    description: "Success status for applied AI file operations",
  },
  "aiAgent.editApproval.failed": {
    message: "Bearbeiten fehlgeschlagen",
    description: "Fallback error for a failed AI file edit",
  },
};

export default deAiAgent;
