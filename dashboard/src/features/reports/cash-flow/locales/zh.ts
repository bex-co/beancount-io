export interface TranslationEntry {
  message: string;
  description: string;
}

const zhCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "已关闭",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "账户",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "启用中",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "余额",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "按活动",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message: "{ledgerName}每个区间的经营、投资和筹资活动现金流量",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message: "编制本报表时被视为现金及现金等价物的账户。",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "本报表中的现金及现金等价物",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "期末现金及现金等价物",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "已声明",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message: "通过账本中的 cash-flow-role 元数据声明的活动",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "筹资活动",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "隐藏已关闭",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "投资活动",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "净现金流量",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message: "追踪{ledgerName}按币种划分的净现金流量随时间的变化",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "现金及现金等价物净变动",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message: "{ledgerName}的期初和期末现金及现金等价物，以及本期净变动额",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message: "未找到此账本的现金流量数据。",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "期初现金及现金等价物",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "经营活动",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "显示已关闭",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "状态",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message: "未知的 cash-flow-role 值，使用默认值",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default zhCashFlow;
