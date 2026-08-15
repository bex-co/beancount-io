export interface TranslationEntry {
  message: string;
  description: string;
}

const deWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message:
      "Erstellen Sie ein neues Beancount-Hauptbuch, um mit der Verwaltung Ihrer Finanzen zu beginnen.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "Erstellen Sie Ihr erstes Hauptbuch",
    description: "Button text to create first ledger",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "Hauptbuch erfolgreich erstellt",
    description: "Toast notification when ledger created",
  },
};

export default deWelcomePage;
