export interface TranslationEntry {
  message: string;
  description: string;
}

const esAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Pregunta a Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Pregúntame cualquier cosa sobre Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.readOnlyTitle": {
    message: "Agente de solo lectura",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "Puedes hacer preguntas y analizar archivos. Los cambios requieren acceso de escritura, pero puedo prepararlos para ti.",
    description: "Explanation shown when the agent cannot change the ledger",
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
  "aiAgent.quickAskPlaceholder": {
    message: "Pregúntame cualquier cosa sobre este libro mayor...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Preguntar",
    description: "Button text to submit quick question",
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
  "aiAgent.receiptApproval.title": {
    message: "Registrar transacción del recibo",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "Preparando la transacción…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "Transacción registrada",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "No se pudo registrar la transacción",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "Fecha",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "Beneficiario",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "Importe",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "Gasto",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "Pago",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "Adjuntar archivo",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "Eliminar {fileName}",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "falló",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "Desplazarse al final",
    description: "Aria label for the scroll to bottom button in the chat",
  },
  "aiAgent.attachment": {
    message: "archivo adjunto",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.preparing": {
    message: "Preparando…",
    description: "Status while an AI tool is preparing",
  },
  "aiAgent.toolFailed": {
    message: "{tool} falló",
    description: "Fallback error when an AI tool fails",
  },
  "aiAgent.toolList": {
    message: "Lista",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "Leer",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "Comprobación del contexto del libro mayor",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "{count} archivo(s) marcado(s)",
    description: "Summary of files inspected by AI tools",
  },
  "aiAgent.ranQueries": {
    message: "Ejecutó {count} consulta o consultas",
    description: "Summary of queries run by AI tools",
  },
  "aiAgent.usedTools": {
    message: "{count} herramienta(s) usada(s)",
    description: "Summary of tools used by the AI",
  },
  "aiAgent.unknownBlock": {
    message: "Bloque desconocido",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "Preparando cambios…",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "Operación(es) {count} aplicada(s)",
    description: "Success status for applied AI file operations",
  },
  "aiAgent.editApproval.failed": {
    message: "Edición fallida",
    description: "Fallback error for a failed AI file edit",
  },
};

export default esAiAgent;
