export interface TranslationEntry {
  message: string;
  description: string;
}

const jaCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "閉鎖済み",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "勘定科目",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "開設中",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "残高",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "活動別",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "{ledgerName}の営業・投資・財務活動によるキャッシュフロー（期間ごと）",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "この計算書の作成時に現金および現金同等物として扱われる勘定科目です。",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "このレポートの現金および現金同等物",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "期末の現金および現金同等物",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "宣言済み",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message: "元帳の cash-flow-role メタデータで宣言された活動",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "財務活動",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "閉鎖済みを隠す",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "投資活動",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "ネットキャッシュフロー",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message: "{ledgerName}のネットキャッシュフローを通貨別に時系列で追跡します",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "現金および現金同等物の純増減",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message: "{ledgerName}の期首・期末の現金および現金同等物と期間中の純増減",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message: "この元帳のキャッシュフローデータが見つかりません。",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "期首の現金および現金同等物",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "営業活動",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "閉鎖済みを表示",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "ステータス",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message: "不明な cash-flow-role 値です。デフォルトを使用します",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default jaCashFlow;
