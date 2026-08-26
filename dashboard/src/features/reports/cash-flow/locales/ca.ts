export interface TranslationEntry {
  message: string;
  description: string;
}

const caCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "Tancada",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "Compte",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "Oberta",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "Balanç",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "Per activitat",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "Fluxos de caixa operatius, d'inversió i de finançament de {ledgerName} per interval",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "Comptes tractats com a efectiu i equivalents en elaborar aquest estat.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "Efectiu i equivalents en aquest informe",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "Efectiu i equivalents al final del període",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "declarat",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message:
      "Activitat declarada al llibre major mitjançant metadades cash-flow-role",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "Activitats de finançament",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "Amaga les tancades",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "Activitats d'inversió",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "Flux de caixa net",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message:
      "Segueix el flux de caixa net de {ledgerName} per moneda al llarg del temps",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "Variació neta de l'efectiu i equivalents",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message:
      "Efectiu i equivalents a l'inici i al final del període de {ledgerName} amb la variació neta del període",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message: "No s'han trobat dades de flux de caixa per a aquest llibre.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "Efectiu i equivalents a l'inici del període",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "Activitats operatives",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "Mostra les tancades",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "Estat",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message:
      "Valor de cash-flow-role desconegut, s'utilitza el valor per defecte",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default caCashFlow;
