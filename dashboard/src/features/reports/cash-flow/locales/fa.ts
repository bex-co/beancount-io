export interface TranslationEntry {
  message: string;
  description: string;
}

const faCashFlow: Record<string, TranslationEntry> = {
  "page.cashFlow.accountClosed": {
    message: "بسته",
    description: "Status label for a closed cash account",
  },
  "page.cashFlow.accountColumn": {
    message: "حساب",
    description: "Column header for the cash account name",
  },
  "page.cashFlow.accountOpen": {
    message: "باز",
    description: "Status label for an open cash account",
  },
  "page.cashFlow.balanceColumn": {
    message: "موجودی",
    description: "Column header for the cash account balance",
  },
  "page.cashFlow.byActivity": {
    message: "بر اساس فعالیت",
    description: "Tab label for the per-activity cash flow chart",
  },
  "page.cashFlow.byActivityDescription": {
    message:
      "جریان‌های نقدی عملیاتی، سرمایه‌گذاری و تامین مالی {ledgerName} در هر بازه",
    description: "Description for the per-activity cash flow chart",
  },
  "page.cashFlow.cashAccountsDescription": {
    message:
      "حساب‌هایی که هنگام تهیه این صورت‌مالی به‌عنوان وجه نقد و معادل‌های آن در نظر گرفته شده‌اند.",
    description: "Description for the cash and equivalents status panel",
  },
  "page.cashFlow.cashAccountsTitle": {
    message: "وجه نقد و معادل‌های آن در این گزارش",
    description: "Title for the cash and equivalents status panel",
  },
  "page.cashFlow.closingCash": {
    message: "وجه نقد و معادل‌های آن در پایان دوره",
    description: "Label for the closing cash and cash equivalents balance",
  },
  "page.cashFlow.declaredRoleBadge": {
    message: "اعلام‌شده",
    description:
      "Marker shown next to cash-flow rows whose activity classification is declared in the ledger",
  },
  "page.cashFlow.declaredRoleTooltip": {
    message: "فعالیت با فراداده cash-flow-role در دفتر کل اعلام شده است",
    description:
      "Tooltip for the declared marker explaining the classification comes from cash-flow-role metadata in the ledger",
  },
  "page.cashFlow.financing": {
    message: "فعالیت‌های تامین مالی",
    description: "Section title for financing cash flows",
  },
  "page.cashFlow.hideClosedAccounts": {
    message: "پنهان کردن بسته‌ها",
    description: "Button label to hide closed cash accounts",
  },
  "page.cashFlow.investing": {
    message: "فعالیت‌های سرمایه‌گذاری",
    description: "Section title for investing cash flows",
  },
  "page.cashFlow.netCashFlow": {
    message: "جریان نقد خالص",
    description: "Tab label for the net cash flow chart",
  },
  "page.cashFlow.netCashFlowDescription": {
    message:
      "جریان نقد خالص {ledgerName} را به تفکیک ارز در طول زمان دنبال کنید",
    description: "Description for the net cash flow chart",
  },
  "page.cashFlow.netChangeInCash": {
    message: "تغییر خالص در وجه نقد و معادل‌های آن",
    description: "Label for the net change in cash and cash equivalents",
  },
  "page.cashFlow.netChangeDescription": {
    message:
      "وجه نقد و معادل‌های آن در ابتدا و پایان دوره برای {ledgerName} به همراه تغییر خالص طی دوره",
    description: "Description for the net change in cash summary card",
  },
  "page.cashFlow.noData": {
    message: "هیچ داده جریان نقدینگی برای این دفتر یافت نشد.",
    description: "Empty state message for cash flow statement",
  },
  "page.cashFlow.openingCash": {
    message: "وجه نقد و معادل‌های آن در ابتدای دوره",
    description: "Label for the opening cash and cash equivalents balance",
  },
  "page.cashFlow.operating": {
    message: "فعالیت‌های عملیاتی",
    description: "Section title for operating cash flows",
  },
  "page.cashFlow.showClosedAccounts": {
    message: "نمایش بسته‌ها",
    description: "Button label to reveal closed cash accounts",
  },
  "page.cashFlow.statusColumn": {
    message: "وضعیت",
    description: "Column header for the cash account open/closed status",
  },
  "page.cashFlow.unknownCashFlowRole": {
    message: "مقدار ناشناخته cash-flow-role، از مقدار پیش‌فرض استفاده می‌شود",
    description:
      "Note shown when an account's cash-flow-role metadata value is not a valid role and the default heuristic is used",
  },
};

export default faCashFlow;
