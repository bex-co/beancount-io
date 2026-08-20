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
  "aiAgent.prCreated": {
    message: "✓ Pull Request créée",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "Voir PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Posez-moi n'importe quelle question sur ce grand livre...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Demander",
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
  "aiAgent.suggestionsTitle": {
    message: "Essayez de demander :",
    description:
      "Heading above suggested example questions in the empty chat state",
  },
  "aiAgent.suggestions.diningLastMonth": {
    message: "Combien ai-je dépensé en restauration le mois dernier ?",
    description: "Suggested question: dining spend last month",
  },
  "aiAgent.suggestions.netWorth": {
    message: "Quelle est ma valeur nette actuelle ?",
    description: "Suggested question: current net worth",
  },
  "aiAgent.suggestions.topCategories": {
    message: "Montre-moi mes 5 principales catégories de dépenses cette année",
    description: "Suggested question: top 5 expense categories this year",
  },
  "aiAgent.suggestions.uncategorized": {
    message: "Ai-je des transactions non catégorisées ?",
    description: "Suggested question: uncategorized transactions",
  },
  "aiAgent.suggestions.monthOverMonth": {
    message: "Compare mes dépenses de ce mois à celles du mois dernier",
    description: "Suggested question: compare this month to last month",
  },
  "aiAgent.suggestions.largestExpense": {
    message: "Quelle est ma plus grosse dépense de ce trimestre ?",
    description: "Suggested question: largest single expense this quarter",
  },
  "aiAgent.stop": {
    message: "Arrêter",
    description: "Button to stop an in-flight AI response",
  },
  "aiAgent.stopped": {
    message: "Arrêté",
    description: "Label shown on an AI response the user stopped",
  },
  "aiAgent.answeredIn": {
    message: "Répondu en {duration}",
    description:
      "Shown under a completed AI answer; {duration} is a formatted elapsed time like 12.3s or 1m 5s",
  },
  "aiAgent.retry": {
    message: "Réessayer",
    description: "Button to resubmit the last question after an error",
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
};

export default frAiAgent;
