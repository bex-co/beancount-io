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
    message: "Pregunta sobre tu libro contable o adjunta un recibo o extracto…",
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
  "aiAgent.stop": {
    message: "Detener",
    description: "Accessible name for stopping an in-progress AI response",
  },
  "aiAgent.stopped": {
    message: "Generación detenida",
    description: "Toast shown after the user stops an in-progress AI response",
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
    message: "Crecimiento",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "Organización",
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
    message: "Solicitud de edición",
    description: "Title for the file edit approval card",
  },
  "aiAgent.editApproval.approve": {
    message: "Aprobar",
    description: "Button to approve an AI file edit",
  },
  "aiAgent.editApproval.deny": {
    message: "Denegar",
    description: "Button to deny an AI file edit",
  },
  "aiAgent.editApproval.approved": {
    message: "Aprobado",
    description: "Badge shown after user approved the edit",
  },
  "aiAgent.editApproval.denied": {
    message: "Denegado",
    description: "Badge shown after user denied the edit",
  },
  "aiAgent.editApproval.newFile": {
    message: "Archivo nuevo",
    description: "Label in diff block when creating a new file",
  },
  "aiAgent.editApproval.replaceFile": {
    message: "Reemplazar archivo",
    description: "Label in diff block when replacing an entire file",
  },
  "aiAgent.editApproval.deleteFile": {
    message: "Eliminar archivo",
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
    message: "{count} archivos revisados",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.checkedFiles_one": {
    message: "{count} archivo revisado",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.checkedFiles_many": {
    message: "{count} archivos revisados",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - form for large round counts such as millions",
  },
  "aiAgent.checkedFiles_other": {
    message: "{count} archivos revisados",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - plural form",
  },
  "aiAgent.ranQueries": {
    message: "{count} consultas ejecutadas",
    description:
      "Summary of queries run by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.ranQueries_one": {
    message: "{count} consulta ejecutada",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.ranQueries_many": {
    message: "{count} consultas ejecutadas",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - form for large round counts such as millions",
  },
  "aiAgent.ranQueries_other": {
    message: "{count} consultas ejecutadas",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - plural form",
  },
  "aiAgent.usedTools": {
    message: "{count} herramientas usadas",
    description:
      "Summary of tools used by the AI - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.usedTools_one": {
    message: "{count} herramienta usada",
    description:
      "Summary of tools used by the AI - interpolation: {count} - singular form",
  },
  "aiAgent.usedTools_many": {
    message: "{count} herramientas usadas",
    description:
      "Summary of tools used by the AI - interpolation: {count} - form for large round counts such as millions",
  },
  "aiAgent.usedTools_other": {
    message: "{count} herramientas usadas",
    description:
      "Summary of tools used by the AI - interpolation: {count} - plural form",
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
    message: "{count} operaciones aplicadas",
    description:
      "Success status for applied AI file operations - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.editApproval.appliedOperations_one": {
    message: "{count} operación aplicada",
    description:
      "Success status for applied AI file operations - interpolation: {count} - singular form",
  },
  "aiAgent.editApproval.appliedOperations_many": {
    message: "{count} operaciones aplicadas",
    description:
      "Success status for applied AI file operations - interpolation: {count} - form for large round counts such as millions",
  },
  "aiAgent.editApproval.appliedOperations_other": {
    message: "{count} operaciones aplicadas",
    description:
      "Success status for applied AI file operations - interpolation: {count} - plural form",
  },
  "aiAgent.editApproval.failed": {
    message: "Edición fallida",
    description: "Fallback error for a failed AI file edit",
  },
  "aiAgent.starterPromptExpenses": {
    message: "Desglosar los gastos del mes pasado",
    description: "Starter prompt chip asking about top recent expenses",
  },
  "aiAgent.starterPromptNetWorth": {
    message: "Resume la tendencia de mi patrimonio neto",
    description: "Starter prompt chip asking for a net worth summary",
  },
  "aiAgent.starterPromptAssets": {
    message: "Muestra mi distribución actual de activos",
    description: "Starter prompt chip asking for current asset allocation",
  },
  "aiAgent.starterPromptReview": {
    message: "Buscar asientos sin categoría o inusuales",
    description:
      "Starter prompt chip asking to review uncategorized or unusual entries",
  },
  "aiAgent.attachFormatsHint": {
    message: "PDF, CSV o imagen de recibo",
    description:
      "Short hint beside the attach button showing supported file types",
  },
  "aiAgent.enterToSend": {
    message: "Enter para enviar",
    description: "Keyboard shortcut hint beside the send button",
  },
  "aiAgent.newChat": {
    message: "Nuevo chat",
    description: "Button label to reset and start a new AI agent conversation",
  },
  "aiAgent.generating": {
    message: "Generando…",
    description:
      "Short status label beside the stop button while a response is generating",
  },
  "aiAgent.restorePrompt": {
    message: "Restaurar consulta",
    description:
      "Button label in error banner to copy the failed message back into the composer",
  },
};

export default esAiAgent;
