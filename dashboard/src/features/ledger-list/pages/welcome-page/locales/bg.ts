export interface TranslationEntry {
  message: string;
  description: string;
}

const bgWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message:
      "Създайте нова книга на Beancount, за да започнете управлението на финансите си.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "Създайте първата си книга",
    description: "Button text to create first ledger",
  },
  "page.welcome.failedToCreateLedger": {
    message: "Неуспешно създаване на книга",
    description: "Error message when ledger creation fails",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "Книгата е създадена успешно",
    description: "Toast notification when ledger created",
  },
};

export default bgWelcomePage;
