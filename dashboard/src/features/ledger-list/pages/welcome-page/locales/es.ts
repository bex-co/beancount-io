export interface TranslationEntry {
  message: string;
  description: string;
}

const esWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message:
      "Cree un nuevo libro mayor de Beancount para comenzar a administrar sus finanzas.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "Cree su Primer Libro Mayor",
    description: "Button text to create first ledger",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "Libro mayor creado exitosamente",
    description: "Toast notification when ledger created",
  },
};

export default esWelcomePage;
