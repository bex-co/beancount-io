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
  "aiAgent.readOnlyTitle": {
    message: "Agente somente leitura",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "Você pode fazer perguntas e analisar arquivos. As alterações exigem acesso de gravação, mas posso prepará-las para você.",
    description: "Explanation shown when the agent cannot change the ledger",
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
  "aiAgent.stop": {
    message: "Parar",
    description: "Accessible name for stopping an in-progress AI response",
  },
  "aiAgent.stopped": {
    message: "Geração interrompida",
    description: "Toast shown after the user stops an in-progress AI response",
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
    message: "Crescimento",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "Organização",
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
    message: "Solicitação de edição",
    description: "Title for the file edit approval card",
  },
  "aiAgent.editApproval.approve": {
    message: "Aprovar",
    description: "Button to approve an AI file edit",
  },
  "aiAgent.editApproval.deny": {
    message: "Negar",
    description: "Button to deny an AI file edit",
  },
  "aiAgent.editApproval.approved": {
    message: "Aprovado",
    description: "Badge shown after user approved the edit",
  },
  "aiAgent.editApproval.denied": {
    message: "Negado",
    description: "Badge shown after user denied the edit",
  },
  "aiAgent.editApproval.newFile": {
    message: "Novo arquivo",
    description: "Label in diff block when creating a new file",
  },
  "aiAgent.editApproval.replaceFile": {
    message: "Substituir arquivo",
    description: "Label in diff block when replacing an entire file",
  },
  "aiAgent.editApproval.deleteFile": {
    message: "Excluir arquivo",
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
    message: "{count} arquivos verificados",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.checkedFiles_one": {
    message: "{count} arquivo verificado",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.checkedFiles_many": {
    message: "{count} arquivos verificados",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - form for large round counts such as millions",
  },
  "aiAgent.checkedFiles_other": {
    message: "{count} arquivos verificados",
    description:
      "Summary of files inspected by AI tools - interpolation: {count} - plural form",
  },
  "aiAgent.ranQueries": {
    message: "{count} consultas executadas",
    description:
      "Summary of queries run by AI tools - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.ranQueries_one": {
    message: "{count} consulta executada",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - singular form",
  },
  "aiAgent.ranQueries_many": {
    message: "{count} consultas executadas",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - form for large round counts such as millions",
  },
  "aiAgent.ranQueries_other": {
    message: "{count} consultas executadas",
    description:
      "Summary of queries run by AI tools - interpolation: {count} - plural form",
  },
  "aiAgent.usedTools": {
    message: "{count} ferramentas usadas",
    description:
      "Summary of tools used by the AI - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.usedTools_one": {
    message: "{count} ferramenta usada",
    description:
      "Summary of tools used by the AI - interpolation: {count} - singular form",
  },
  "aiAgent.usedTools_many": {
    message: "{count} ferramentas usadas",
    description:
      "Summary of tools used by the AI - interpolation: {count} - form for large round counts such as millions",
  },
  "aiAgent.usedTools_other": {
    message: "{count} ferramentas usadas",
    description:
      "Summary of tools used by the AI - interpolation: {count} - plural form",
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
    message: "{count} operações aplicadas",
    description:
      "Success status for applied AI file operations - interpolation: {count} (base key for pluralization)",
  },
  "aiAgent.editApproval.appliedOperations_one": {
    message: "{count} operação aplicada",
    description:
      "Success status for applied AI file operations - interpolation: {count} - singular form",
  },
  "aiAgent.editApproval.appliedOperations_many": {
    message: "{count} operações aplicadas",
    description:
      "Success status for applied AI file operations - interpolation: {count} - form for large round counts such as millions",
  },
  "aiAgent.editApproval.appliedOperations_other": {
    message: "{count} operações aplicadas",
    description:
      "Success status for applied AI file operations - interpolation: {count} - plural form",
  },
  "aiAgent.editApproval.failed": {
    message: "Falha na edição",
    description: "Fallback error for a failed AI file edit",
  },
};

export default ptAiAgent;
