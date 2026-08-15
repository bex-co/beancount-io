export interface TranslationEntry {
  message: string;
  description: string;
}

const enWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message: "Create a new Beancount ledger to start managing your finances.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "Create Your First Ledger",
    description: "Button text to create first ledger",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "Ledger created successfully",
    description: "Toast notification when ledger created",
  },
};

export default enWelcomePage;
