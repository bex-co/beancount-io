export interface TranslationEntry {
  message: string;
  description: string;
}

const frWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message:
      "Créez un nouveau grand livre Beancount pour commencer à gérer vos finances.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "Créez votre premier grand livre",
    description: "Button text to create first ledger",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "Grand livre créé avec succès",
    description: "Toast notification when ledger created",
  },
};

export default frWelcomePage;
