export interface TranslationEntry {
  message: string;
  description: string;
}

const enCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "Closed",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "Account",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "Open",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "Balance",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "By Activity",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "Operating, investing, and financing cash flows for {ledgerName} per interval",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "Accounts treated as cash & equivalents when building this statement.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "Cash & cash equivalents in this report",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "Cash & equivalents at period end",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "declared",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message: "Activity declared in the ledger via cash-flow-role metadata",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "Financing Activities",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "Hide closed",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "Investing Activities",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "Net Cash Flow",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message: "Track {ledgerName} net cash flow across currencies over time",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "Net change in cash & equivalents",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message:
      "Opening and closing cash and equivalents for {ledgerName} with the net change over the period",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message: "No cash flow data found for this ledger.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "Cash & equivalents at period start",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "Operating Activities",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "Show closed",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "Status",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message: "Unknown cash-flow-role value, using default",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default enCashFlow;
