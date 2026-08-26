export interface TranslationEntry {
  message: string;
  description: string;
}

const ptCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "Fechada",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "Conta",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "Aberta",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "Saldo",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "Por atividade",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "Fluxos de caixa operacionais, de investimento e de financiamento de {ledgerName} por intervalo",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "Contas tratadas como caixa e equivalentes ao elaborar esta demonstração.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "Caixa e equivalentes neste relatório",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "Caixa e equivalentes no fim do período",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "declarado",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message: "Atividade declarada no razão via metadados cash-flow-role",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "Atividades de financiamento",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "Ocultar fechadas",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "Atividades de investimento",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "Fluxo de caixa líquido",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message:
      "Acompanhe o fluxo de caixa líquido de {ledgerName} por moeda ao longo do tempo",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "Variação líquida de caixa e equivalentes",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message:
      "Caixa e equivalentes no início e no fim do período de {ledgerName} com a variação líquida do período",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message: "Nenhum dado de fluxo de caixa encontrado para este livro-razão.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "Caixa e equivalentes no início do período",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "Atividades operacionais",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "Mostrar fechadas",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "Status",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message: "Valor de cash-flow-role desconhecido, usando o padrão",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default ptCashFlow;
