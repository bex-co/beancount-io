export interface TranslationEntry {
  message: string;
  description: string;
}

const koCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "폐쇄됨",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "계정",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "개설됨",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "잔액",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "활동별",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message: "{ledgerName}의 영업·투자·재무 활동 현금 흐름(기간별)",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message: "이 명세서 작성 시 현금 및 현금성자산으로 처리된 계정입니다.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "이 보고서의 현금 및 현금성자산",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "기말 현금 및 현금성자산",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "선언됨",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message: "원장의 cash-flow-role 메타데이터로 선언된 활동",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "재무 활동",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "폐쇄된 계정 숨기기",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "투자 활동",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "순현금흐름",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message: "{ledgerName}의 순현금흐름을 통화별로 시간에 따라 추적하세요",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "현금 및 현금성자산 순변동",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message: "{ledgerName}의 기초·기말 현금 및 현금성자산과 기간 순변동",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message: "이 장부의 현금흐름 데이터를 찾을 수 없습니다.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "기초 현금 및 현금성자산",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "영업 활동",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "폐쇄된 계정 표시",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "상태",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message: "알 수 없는 cash-flow-role 값입니다. 기본값을 사용합니다",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default koCashFlow;
