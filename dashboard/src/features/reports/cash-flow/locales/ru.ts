export interface TranslationEntry {
  message: string;
  description: string;
}

const ruCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "Закрыт",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "Счёт",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "Открыт",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "Баланс",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "По деятельности",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "Операционные, инвестиционные и финансовые денежные потоки {ledgerName} по интервалам",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "Счета, учитываемые как денежные средства и эквиваленты при составлении этого отчёта.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "Денежные средства и эквиваленты в этом отчёте",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "Денежные средства и эквиваленты на конец периода",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "объявлено",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message:
      "Деятельность объявлена в главной книге через метаданные cash-flow-role",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "Финансовая деятельность",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "Скрыть закрытые",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "Инвестиционная деятельность",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "Чистый денежный поток",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message:
      "Отслеживайте чистый денежный поток {ledgerName} по валютам во времени",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "Чистое изменение денежных средств и эквивалентов",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message:
      "Денежные средства и эквиваленты на начало и конец периода для {ledgerName} с чистым изменением за период",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message:
      "Данные о движении денежных средств не найдены для этой главной книги.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "Денежные средства и эквиваленты на начало периода",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "Операционная деятельность",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "Показать закрытые",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "Статус",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message:
      "Неизвестное значение cash-flow-role, используется значение по умолчанию",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default ruCashFlow;
