export interface TranslationEntry {
  message: string;
  description: string;
}

const nlCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "Gesloten",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "Rekening",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "Open",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "Saldo",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "Per activiteit",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "Operationele, investerings- en financieringskasstromen voor {ledgerName} per interval",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "Rekeningen die bij het opstellen van dit overzicht als kasmiddelen en equivalenten worden behandeld.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "Kasmiddelen en equivalenten in dit rapport",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "Kasmiddelen en equivalenten aan het einde van de periode",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "gedeclareerd",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message:
      "Activiteit gedeclareerd in het grootboek via cash-flow-role-metadata",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "Financieringsactiviteiten",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "Gesloten verbergen",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "Investeringsactiviteiten",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "Netto kasstroom",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message:
      "Volg de netto kasstroom van {ledgerName} per valuta in de loop van de tijd",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "Netto verandering in kasmiddelen en equivalenten",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message:
      "Kasmiddelen en equivalenten aan het begin en einde van de periode voor {ledgerName} met de netto verandering over de periode",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message: "Geen kasstroomgegevens gevonden voor dit grootboek.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "Kasmiddelen en equivalenten aan het begin van de periode",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "Operationele activiteiten",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "Gesloten tonen",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "Status",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message: "Onbekende cash-flow-role-waarde, standaard wordt gebruikt",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default nlCashFlow;
