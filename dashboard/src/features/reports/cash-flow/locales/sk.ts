export interface TranslationEntry {
  message: string;
  description: string;
}

const skCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "Uzavretý",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "Účet",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "Otvorený",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "Zostatok",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "Podľa činnosti",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "Prevádzkové, investičné a finančné peňažné toky pre {ledgerName} za interval",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "Účty považované pri zostavovaní tohto výkazu za peňažné prostriedky a ich ekvivalenty.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "Peňažné prostriedky a ich ekvivalenty v tejto správe",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "Peňažné prostriedky a ich ekvivalenty na konci obdobia",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "deklarované",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message: "Aktivita deklarovaná v hlavnej knihe cez metadáta cash-flow-role",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "Finančná činnosť",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "Skryť uzavreté",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "Investičná činnosť",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "Čistý peňažný tok",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message: "Sledujte čistý peňažný tok {ledgerName} podľa mien v čase",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "Čistá zmena peňažných prostriedkov a ich ekvivalentov",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message:
      "Peňažné prostriedky a ich ekvivalenty na začiatku a na konci obdobia pre {ledgerName} s čistou zmenou za obdobie",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message:
      "Pre tento účtovný denník sa nenašli žiadne údaje o peňažných tokoch.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "Peňažné prostriedky a ich ekvivalenty na začiatku obdobia",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "Prevádzková činnosť",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "Zobraziť uzavreté",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "Stav",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message: "Neznáma hodnota cash-flow-role, použije sa predvolená hodnota",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default skCashFlow;
