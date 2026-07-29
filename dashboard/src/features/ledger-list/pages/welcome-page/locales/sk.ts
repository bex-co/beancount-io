export interface TranslationEntry {
  message: string;
  description: string;
}

const skWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message:
      "Vytvorte si novú Beancount knihu a začnite spravovať svoje financie.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "Vytvorte svoju prvú knihu",
    description: "Button text to create first ledger",
  },
  "page.welcome.failedToCreateLedger": {
    message: "Vytvorenie knihy zlyhalo",
    description: "Error message when ledger creation fails",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "Kniha bola úspešne vytvorená",
    description: "Success message when ledger is created",
  },
};

export default skWelcomePage;
