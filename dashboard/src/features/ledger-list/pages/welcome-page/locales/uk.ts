export interface TranslationEntry {
  message: string;
  description: string;
}

const ukWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message:
      "Створіть нову книгу Beancount, щоб почати керувати своїми фінансами.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "Створіть свою першу книгу",
    description: "Button text to create first ledger",
  },
  "page.welcome.failedToCreateLedger": {
    message: "Не вдалося створити книгу",
    description: "Error message when ledger creation fails",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "Пedger created successfully",
    description: "Toast notification when ledger created",
  },
};

export default ukWelcomePage;
