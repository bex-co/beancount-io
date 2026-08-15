export interface TranslationEntry {
  message: string;
  description: string;
}

const nlWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message:
      "Maak een nieuw Beancount grootboek aan om uw financiën te beheren.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "Maak uw eerste grootboek aan",
    description: "Button text to create first ledger",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "Grootboek succesvol aangemaakt",
    description: "Toast notification when ledger created",
  },
};

export default nlWelcomePage;
