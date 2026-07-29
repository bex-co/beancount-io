export interface TranslationEntry {
  message: string;
  description: string;
}

const ruWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message: "Создайте новую книгу Beancount для управления вашими финансами.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "Создать вашу первую книгу",
    description: "Button text to create first ledger",
  },
  "page.welcome.failedToCreateLedger": {
    message: "Не удалось создать книгу",
    description: "Error message when ledger creation fails",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "Книга успешно создана",
    description: "Toast notification when ledger created",
  },
};

export default ruWelcomePage;
