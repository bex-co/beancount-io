export interface TranslationEntry {
  message: string;
  description: string;
}

const frAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Demandez à Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Posez-moi des questions sur Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.readOnlyTitle": {
    message: "Agent en lecture seule",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "Vous pouvez poser des questions et analyser des fichiers. Les modifications nécessitent un accès en écriture, mais je peux les préparer pour vous.",
    description: "Explanation shown when the agent cannot change the ledger",
  },
  "aiAgent.welcome": {
    message:
      "Bonjour ! Je suis votre assistant IA Beancount, ici pour vous aider avec votre comptabilité en texte brut.\n\n" +
      "Je peux :\n" +
      "• Expliquer la syntaxe de Beancount et déboguer les erreurs\n" +
      "• Vous guider dans la rédaction de transactions, comptes et directives\n" +
      "• Répondre aux questions de comptabilité et de tenue de livres\n" +
      "• Aider avec les requêtes, rapports et meilleures pratiques\n\n" +
      "Que voulez-vous savoir ?",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Posez-moi n'importe quelle question sur ce grand livre...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Demander",
    description: "Button text to submit quick question",
  },
  "aiAgent.upgradeTitle": {
    message: "Les requêtes IA s'épuisent",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "Vous avez utilisé {used} sur {max} requêtes ce mois-ci. Passez à un plan supérieur pour en obtenir plus.",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "Mettre à niveau",
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
    message: "/mois",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count} tokens / mois",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "Populaire",
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
    message: "Enregistrer la transaction du reçu",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "Préparation de la transaction…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "Transaction enregistrée",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "Échec de l'enregistrement de la transaction",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "Date",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "Bénéficiaire",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "Montant",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "Dépense",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "Paiement",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "Joindre un fichier",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "Supprimer {fileName}",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "échec",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "Faire défiler vers le bas",
    description: "Aria label for the scroll to bottom button in the chat",
  },
  "aiAgent.attachment": {
    message: "pièce jointe",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.preparing": {
    message: "Préparation…",
    description: "Status while an AI tool is preparing",
  },
  "aiAgent.toolFailed": {
    message: "{tool} a échoué",
    description: "Fallback error when an AI tool fails",
  },
  "aiAgent.toolList": {
    message: "Liste",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "Lire",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "Vérification du contexte du grand livre",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "Fichier(s) {count} vérifié(s)",
    description: "Summary of files inspected by AI tools",
  },
  "aiAgent.ranQueries": {
    message: "a exécuté {count} requête(s)",
    description: "Summary of queries run by AI tools",
  },
  "aiAgent.usedTools": {
    message: "Outil(s) {count} utilisé(s)",
    description: "Summary of tools used by the AI",
  },
  "aiAgent.unknownBlock": {
    message: "Bloc inconnu",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "Préparer les modifications…",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "{count} opération(s) appliquée(s)",
    description: "Success status for applied AI file operations",
  },
  "aiAgent.editApproval.failed": {
    message: "Échec de la modification",
    description: "Fallback error for a failed AI file edit",
  },
};

export default frAiAgent;
