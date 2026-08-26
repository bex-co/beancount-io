export interface TranslationEntry {
  message: string;
  description: string;
}

const frCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "Fermé",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "Compte",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "Ouvert",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "Solde",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "Par activité",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "Flux de trésorerie opérationnels, d'investissement et de financement de {ledgerName} par intervalle",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "Comptes traités comme trésorerie et équivalents lors de l'établissement de cet état.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "Trésorerie et équivalents dans ce rapport",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "Trésorerie et équivalents en fin de période",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "déclaré",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message:
      "Activité déclarée dans le grand livre via les métadonnées cash-flow-role",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "Activités de financement",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "Masquer les comptes fermés",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "Activités d'investissement",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "Flux de trésorerie net",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message:
      "Suivez le flux de trésorerie net de {ledgerName} par devise au fil du temps",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "Variation nette de la trésorerie et équivalents",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message:
      "Trésorerie et équivalents en début et en fin de période pour {ledgerName}, avec la variation nette sur la période",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message: "Aucune donnée de flux de trésorerie trouvée pour ce grand livre.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "Trésorerie et équivalents en début de période",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "Activités opérationnelles",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "Afficher les comptes fermés",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "Statut",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message:
      "Valeur cash-flow-role inconnue, la valeur par défaut est utilisée",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default frCashFlow;
