export interface TranslationEntry {
  message: string;
  description: string;
}

const ptAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Pergunte ao Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Pergunte-me qualquer coisa sobre Beancount...",
    description: "Input placeholder text",
  },
  "aiAgent.welcome": {
    message:
      "Olá! Sou seu assistente de IA do Beancount, aqui para ajudá-lo com sua contabilidade em texto simples.\n\n" +
      "Posso:\n" +
      "• Explicar a sintaxe do Beancount e depurar erros\n" +
      "• Guiá-lo na escrita de transações, contas e diretivas\n" +
      "• Responder perguntas de contabilidade e escrituração\n" +
      "• Ajudar com consultas, relatórios e melhores práticas\n\n" +
      "O que você gostaria de saber?",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "Pergunte-me qualquer coisa sobre este livro-razão...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "Perguntar",
    description: "Button text to submit quick question",
  },
  "aiAgent.upgradeTitle": {
    message: "Solicitações de IA estão acabando",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "Você usou {used} de {max} solicitações este mês. Atualize para mais.",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "Atualizar",
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
    message: "/mês",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count} tokens / mês",
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
    message: "Registrar transação do recibo",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "Preparando transação…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "Transação registrada",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "Falha ao registrar a transação",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "Data",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "Beneficiário",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "Valor",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "Despesa",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "Pagamento",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "Anexar arquivo",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "Remover {fileName}",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "falhou",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "Rolar até o fim",
    description: "Aria label for the scroll to bottom button in the chat",
  },
  "aiAgent.attachment": {
    message: "anexo",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.preparing": {
    message: "Preparando…",
    description: "Status while an AI tool is preparing",
  },
  "aiAgent.toolFailed": {
    message: "{tool} falhou",
    description: "Fallback error when an AI tool fails",
  },
  "aiAgent.toolList": {
    message: "Lista",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "Leia",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "Verificando o contexto do razão",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "arquivo(s) {count} verificado(s)",
    description: "Summary of files inspected by AI tools",
  },
  "aiAgent.ranQueries": {
    message: "executou consulta ou consultas {count}",
    description: "Summary of queries run by AI tools",
  },
  "aiAgent.usedTools": {
    message: "Ferramentas {count} usadas",
    description: "Summary of tools used by the AI",
  },
  "aiAgent.unknownBlock": {
    message: "Bloco desconhecido",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "Preparando mudanças…",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "Operação(ões) {count} aplicadas",
    description: "Success status for applied AI file operations",
  },
  "aiAgent.editApproval.failed": {
    message: "Falha na edição",
    description: "Fallback error for a failed AI file edit",
  },
};

export default ptAiAgent;
