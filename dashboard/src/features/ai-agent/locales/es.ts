export interface TranslationEntry {
  message: string;
  description: string;
}

const esAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Pregunta a Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.subtitle": {
    message: "Ayuda impulsada por IA para tu libro mayor",
    description: "Subtitle for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Pregúntame cualquier cosa sobre Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.send": {
    message: "Enviar",
    description: "Send button text",
  },
  "aiAgent.sending": {
    message: "Enviando...",
    description: "Loading state text",
  },
  "aiAgent.welcome": {
    message:
      "¡Hola! Soy tu asistente de IA para Beancount, aquí para ayudarte con tu contabilidad de texto plano.\n\n" +
      "Puedo:\n" +
      "• Explicar la sintaxis de Beancount y depurar errores\n" +
      "• Guiarte en la escritura de transacciones, cuentas y directivas\n" +
      "• Responder preguntas de contabilidad y teneduría de libros\n" +
      "• Ayudar con consultas, informes y mejores prácticas\n\n" +
      "¿Qué te gustaría saber?",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.you": {
    message: "Tú",
    description: "Label for user messages",
  },
  "aiAgent.assistant": {
    message: "Asistente IA",
    description: "Label for AI assistant messages",
  },
  "aiAgent.prCreated": {
    message: "✓ Pull Request creado",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "Ver PR #",
    description: "Link text to view pull request",
  },
  "aiAgent.status.connecting": {
    message: "Pensando...",
    description: "Status badge text when connecting to AI",
  },
  "aiAgent.status.streaming": {
    message: "Transmitiendo...",
    description: "Status badge text when receiving AI response",
  },
  "aiAgent.status.finalizing": {
    message: "Finalizando...",
    description: "Status badge text when finalizing AI response",
  },
  "aiAgent.status.complete": {
    message: "Completo",
    description: "Status badge text when AI response is complete",
  },
  "aiAgent.status.error": {
    message: "Error",
    description: "Status badge text when an error occurs",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Pregúntame cualquier cosa sobre este libro mayor...",
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
    message: "Las solicitudes de IA se están agotando",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "Has usado {used} de {max} solicitudes este mes. Actualiza para obtener más.",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "Actualizar",
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

export default esAiAgent;
