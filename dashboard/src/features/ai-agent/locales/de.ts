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
    message: "Frage zu deinem Hauptbuch oder Beleg bzw. Kontoauszug anhängen…",
    description: "Input placeholder text",
  },
  "aiAgent.readOnlyTitle": {
    message: "Agent mit Lesezugriff",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "Du kannst Fragen stellen und Dateien analysieren. Änderungen benötigen Schreibzugriff, aber ich kann sie für dich entwerfen.",
    description: "Explanation shown when the agent cannot change the ledger",
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
  "aiAgent.stop": {
    message: "Stopp",
    description: "Accessible name for stopping an in-progress AI response",
  },
  "aiAgent.stopped": {
    message: "Erzeugung gestoppt",
    description: "Toast shown after the user stops an in-progress AI response",
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
    message: "Wachstum",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "Organisation",
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
    message: "Bearbeitungsanfrage",
    description: "Title for the file edit approval card",
  },
  "aiAgent.editApproval.approve": {
    message: "Genehmigen",
    description: "Button to approve an AI file edit",
  },
  "aiAgent.editApproval.deny": {
    message: "Ablehnen",
    description: "Button to deny an AI file edit",
  },
  "aiAgent.editApproval.approved": {
    message: "Genehmigt",
    description: "Badge shown after user approved the edit",
  },
  "aiAgent.editApproval.denied": {
    message: "Abgelehnt",
    description: "Badge shown after user denied the edit",
  },
  "aiAgent.editApproval.newFile": {
    message: "Neue Datei",
    description: "Label in diff block when creating a new file",
  },
  "aiAgent.editApproval.replaceFile": {
    message: "Datei ersetzen",
    description: "Label in diff block when replacing an entire file",
  },
  "aiAgent.editApproval.deleteFile": {
    message: "Datei löschen",
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
    message: "{count} Dateien geprüft",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.checkedFiles_one": {
    message: "{count} Datei geprüft",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.checkedFiles_other": {
    message: "{count} Dateien geprüft",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - plural form",
  },
  "aiAgent.ranQueries": {
    message: "{count} Abfragen ausgeführt",
    description:
      "Summary of queries run by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.ranQueries_one": {
    message: "{count} Abfrage ausgeführt",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.ranQueries_other": {
    message: "{count} Abfragen ausgeführt",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - plural form",
  },
  "aiAgent.usedTools": {
    message: "{count} Werkzeuge verwendet",
    description:
      "Summary of tools used by the AI - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.usedTools_one": {
    message: "{count} Werkzeug verwendet",
    description:
      "Summary of tools used by the AI - interpolation: {count} - singular form",
  },
  "aiAgent.usedTools_other": {
    message: "{count} Werkzeuge verwendet",
    description:
      "Summary of tools used by the AI - interpolation: {count} - plural form",
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
    message: "{count} Operationen angewendet",
    description:
      "Success status for applied AI file operations - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.editApproval.appliedOperations_one": {
    message: "{count} Operation angewendet",
    description:
      "Success status for applied AI file operations - interpolation: {count} - singular form",
  },
  "aiAgent.editApproval.appliedOperations_other": {
    message: "{count} Operationen angewendet",
    description:
      "Success status for applied AI file operations - interpolation: {count} - plural form",
  },
  "aiAgent.editApproval.failed": {
    message: "Bearbeiten fehlgeschlagen",
    description: "Fallback error for a failed AI file edit",
  },
  "aiAgent.starterPromptExpenses": {
    message: "Ausgaben des letzten Monats aufschlüsseln",
    description: "Starter prompt chip asking about top recent expenses",
  },
  "aiAgent.starterPromptNetWorth": {
    message: "Fasse den Verlauf meines Nettovermögens zusammen",
    description: "Starter prompt chip asking for a net worth summary",
  },
  "aiAgent.starterPromptAssets": {
    message: "Zeige meine aktuelle Vermögensaufteilung",
    description: "Starter prompt chip asking for current asset allocation",
  },
  "aiAgent.starterPromptReview": {
    message: "Unkategorisierte oder ungewöhnliche Buchungen prüfen",
    description:
      "Starter prompt chip asking to review uncategorized or unusual entries",
  },
  "aiAgent.attachFormatsHint": {
    message: "PDF, CSV oder Belegbild",
    description:
      "Short hint beside the attach button showing supported file types",
  },
  "aiAgent.enterToSend": {
    message: "Enter zum Senden",
    description: "Keyboard shortcut hint beside the send button",
  },
  "aiAgent.newChat": {
    message: "Neuer Chat",
    description: "Button label to reset and start a new AI agent conversation",
  },
  "aiAgent.generating": {
    message: "Wird erstellt…",
    description:
      "Short status label beside the stop button while a response is generating",
  },
  "aiAgent.restorePrompt": {
    message: "Eingabe wiederherstellen",
    description:
      "Button label in error banner to copy the failed message back into the composer",
  },
};

export default deAiAgent;
