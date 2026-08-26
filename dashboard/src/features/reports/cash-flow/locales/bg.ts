export interface TranslationEntry {
  message: string;
  description: string;
}

const bgCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "Затворена",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "Сметка",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "Отворена",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "Баланс",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "По дейност",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "Оперативни, инвестиционни и финансови парични потоци за {ledgerName} по интервали",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "Сметки, третирани като парични средства и еквиваленти при изготвянето на този отчет.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "Парични средства и еквиваленти в този отчет",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "Парични средства и еквиваленти в края на периода",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "декларирано",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message:
      "Дейността е декларирана в главната книга чрез метаданни cash-flow-role",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "Финансова дейност",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "Скрий затворените",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "Инвестиционна дейност",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "Нетен паричен поток",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message:
      "Проследявайте нетния паричен поток на {ledgerName} по валути във времето",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "Нетна промяна в паричните средства и еквиваленти",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message:
      "Парични средства и еквиваленти в началото и края на периода за {ledgerName} с нетната промяна за периода",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message: "Няма намерени данни за паричен поток за тази книга.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "Парични средства и еквиваленти в началото на периода",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "Оперативна дейност",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "Покажи затворените",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "Статус",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message:
      "Неизвестна стойност на cash-flow-role, използва се стойността по подразбиране",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default bgCashFlow;
