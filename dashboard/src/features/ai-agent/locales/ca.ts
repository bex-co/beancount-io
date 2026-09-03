export interface TranslationEntry {
  message: string;
  description: string;
}

const caAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Pregunta a Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Pregunta'm qualsevol cosa sobre Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.readOnlyTitle": {
    message: "Assistent de només lectura",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "Pots fer preguntes i analitzar fitxers. Els canvis requereixen permís d'escriptura, però puc preparar-los per a tu.",
    description: "Explanation shown when the agent cannot change the ledger",
  },
  "aiAgent.welcome": {
    message:
      "Hola! Sóc el teu assistent d'IA per a Beancount, aquí per ajudar-te amb la teva comptabilitat en text pla.\n\n" +
      "Puc:\n" +
      "• Explicar la sintaxi de Beancount i depurar errors\n" +
      "• Guiar-te en l'escriptura de transaccions, comptes i directives\n" +
      "• Respondre preguntes de comptabilitat i teneduría de llibres\n" +
      "• Ajudar amb consultes, informes i bones pràctiques\n\n" +
      "Què vols saber?",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Pregunta'm qualsevol cosa sobre aquest llibre major...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Preguntar",
    description: "Button text to submit quick question",
  },
  "aiAgent.upgradeTitle": {
    message: "Les sol·licituds d'IA s'estan esgotant",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "Heu utilitzat {used} de {max} sol·licituds aquest mes. Actualitzeu per obtenir-ne més.",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "Actualitzar",
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
    message: "/mes",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count} tokens / mes",
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
    message: "Registra la transacció del rebut",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "S'està preparant la transacció…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "Transacció registrada",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "No s'ha pogut registrar la transacció",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "Data",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "Beneficiari",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "Import",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "Despesa",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "Pagament",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "Adjunta un fitxer",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "Elimina {fileName}",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "ha fallat",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "Desplaça't al final",
    description: "Aria label for the scroll to bottom button in the chat",
  },
  "aiAgent.attachment": {
    message: "fitxer adjunt",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.preparing": {
    message: "Preparant...",
    description: "Status while an AI tool is preparing",
  },
  "aiAgent.toolFailed": {
    message: "{tool} ha fallat",
    description: "Fallback error when an AI tool fails",
  },
  "aiAgent.toolList": {
    message: "Llista",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "Llegir",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "Comprovació del context del llibre major",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "S'han comprovat els fitxers {count}",
    description: "Summary of files inspected by AI tools",
  },
  "aiAgent.ranQueries": {
    message: "Ha executat la consulta o consultes {count}",
    description: "Summary of queries run by AI tools",
  },
  "aiAgent.usedTools": {
    message: "Eines {count} utilitzades",
    description: "Summary of tools used by the AI",
  },
  "aiAgent.unknownBlock": {
    message: "Bloc desconegut",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "S'estan preparant els canvis...",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "Operacions aplicades {count}",
    description: "Success status for applied AI file operations",
  },
  "aiAgent.editApproval.failed": {
    message: "L'edició ha fallat",
    description: "Fallback error for a failed AI file edit",
  },
};

export default caAiAgent;
