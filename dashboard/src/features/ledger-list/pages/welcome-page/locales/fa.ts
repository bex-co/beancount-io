export interface TranslationEntry {
  message: string;
  description: string;
}

const faWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message:
      "یک دفتر Beancount جدید ایجاد کنید تا مدیریت امور مالی خود را آغاز کنید.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "ایجاد اولین دفتر",
    description: "Button text to create first ledger",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "دفتر با موفقیت ایجاد شد",
    description: "Toast notification when ledger created",
  },
};

export default faWelcomePage;
