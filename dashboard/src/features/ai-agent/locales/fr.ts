export interface TranslationEntry {
  message: string;
  description: string;
}

const frAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Demandez à Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.subtitle": {
    message: "Aide alimentée par l'IA pour votre grand livre",
    description: "Subtitle for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Posez-moi des questions sur Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.send": {
    message: "Envoyer",
    description: "Send button text",
  },
  "aiAgent.sending": {
    message: "Envoi en cours...",
    description: "Loading state text",
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
  "aiAgent.you": {
    message: "Vous",
    description: "Label for user messages",
  },
  "aiAgent.assistant": {
    message: "Assistant IA",
    description: "Label for AI assistant messages",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request créée",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "Voir PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.status.connecting": {
    message: "Réflexion...",
    description: "Status badge text when connecting to AI",
  },
  "aiAgent.status.streaming": {
    message: "Diffusion...",
    description: "Status badge text when receiving AI response",
  },
  "aiAgent.status.finalizing": {
    message: "Finalisation...",
    description: "Status badge text when finalizing AI response",
  },
  "aiAgent.status.complete": {
    message: "Terminé",
    description: "Status badge text when AI response is complete",
  },
  "aiAgent.status.error": {
    message: "Erreur",
    description: "Status badge text when an error occurs",
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

export default frAiAgent;
