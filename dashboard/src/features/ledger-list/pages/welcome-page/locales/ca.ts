export interface TranslationEntry {
  message: string;
  description: string;
}

const caWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message:
      "Crea un llibre de Beancount nou per començar a gestionar les teves finances.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "Crea el teu primer llibre",
    description: "Button text to create first ledger",
  },
  "page.welcome.failedToCreateLedger": {
    message: "Error en crear el llibre",
    description: "Error message when ledger creation fails",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "Llibre creat correctament",
    description: "Toast notification when ledger created",
  },
};

export default caWelcomePage;
