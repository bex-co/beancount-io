export interface TranslationEntry {
  message: string;
  description: string;
}

const deCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "Geschlossen",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "Konto",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "Offen",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "Saldo",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "Nach Aktivität",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "Betriebliche, Investitions- und Finanzierungszahlungsströme für {ledgerName} pro Intervall",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "Konten, die bei der Erstellung dieser Aufstellung als Zahlungsmittel und -äquivalente behandelt werden.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "Zahlungsmittel und -äquivalente in diesem Bericht",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "Zahlungsmittel und -äquivalente am Periodenende",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "deklariert",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message: "Aktivität im Hauptbuch über cash-flow-role-Metadaten deklariert",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "Finanzierungstätigkeit",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "Geschlossene ausblenden",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "Investitionstätigkeit",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "Netto-Cashflow",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message: "Netto-Cashflow von {ledgerName} nach Währung im Zeitverlauf",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "Nettoveränderung der Zahlungsmittel und -äquivalente",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message:
      "Zahlungsmittel und -äquivalente zu Beginn und Ende der Periode für {ledgerName} mit der Nettoveränderung im Verlauf der Periode",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message: "Keine Cashflow-Daten für dieses Hauptbuch gefunden.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "Zahlungsmittel und -äquivalente zu Periodenbeginn",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "Betriebliche Tätigkeit",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "Geschlossene einblenden",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "Status",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message: "Unbekannter cash-flow-role-Wert, Standard wird verwendet",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default deCashFlow;
