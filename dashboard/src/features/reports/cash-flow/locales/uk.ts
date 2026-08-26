export interface TranslationEntry {
  message: string;
  description: string;
}

const ukCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "Закрито",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "Рахунок",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "Відкрито",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "Баланс",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "За діяльністю",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "Операційні, інвестиційні та фінансові грошові потоки {ledgerName} за інтервалами",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "Рахунки, які під час складання цього звіту вважаються грошовими коштами та їх еквівалентами.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "Грошові кошти та їх еквіваленти в цьому звіті",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "Грошові кошти та їх еквіваленти на кінець періоду",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "оголошено",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message:
      "Діяльність оголошена в головній книзі через метадані cash-flow-role",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "Фінансова діяльність",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "Сховати закриті",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "Інвестиційна діяльність",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "Чистий грошовий потік",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message:
      "Відстежуйте чистий грошовий потік {ledgerName} за валютами з часом",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "Чиста зміна грошових коштів та їх еквівалентів",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message:
      "Грошові кошти та їх еквіваленти на початок і на кінець періоду для {ledgerName} з чистою зміною за період",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message: "Для цієї книги не знайдено даних про рух грошових коштів.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "Грошові кошти та їх еквіваленти на початок періоду",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "Операційна діяльність",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "Показати закриті",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "Статус",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message:
      "Невідоме значення cash-flow-role, використовується значення за замовчуванням",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default ukCashFlow;
