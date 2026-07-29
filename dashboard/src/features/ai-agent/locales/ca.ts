export interface TranslationEntry {
  message: string;
  description: string;
}

const caAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Pregunta a Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.subtitle": {
    message: "Ajuda impulsada per IA per al teu llibre major",
    description: "Subtitle for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Pregunta'm qualsevol cosa sobre Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.send": {
    message: "Enviar",
    description: "Send button text",
  },
  "aiAgent.sending": {
    message: "Enviant...",
    description: "Loading state text",
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
  "aiAgent.you": {
    message: "Tu",
    description: "Label for user messages",
  },
  "aiAgent.assistant": {
    message: "Assistent IA",
    description: "Label for AI assistant messages",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request creat",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "Veure PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.status.connecting": {
    message: "Pensant...",
    description: "Status badge text when connecting to AI",
  },
  "aiAgent.status.streaming": {
    message: "Transmissió...",
    description: "Status badge text when receiving AI response",
  },
  "aiAgent.status.finalizing": {
    message: "Finalitzant...",
    description: "Status badge text when finalizing AI response",
  },
  "aiAgent.status.complete": {
    message: "Completat",
    description: "Status badge text when AI response is complete",
  },
  "aiAgent.status.error": {
    message: "Error",
    description: "Status badge text when an error occurs",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Pregunta'm qualsevol cosa sobre aquest llibre major...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Preguntar",
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

export default caAiAgent;
