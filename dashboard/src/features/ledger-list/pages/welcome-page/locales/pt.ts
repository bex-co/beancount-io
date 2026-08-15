export interface TranslationEntry {
  message: string;
  description: string;
}

const ptWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message:
      "Crie um novo livro-razão Beancount para começar a gerenciar suas finanças.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "Crie Seu Primeiro Livro-Razão",
    description: "Button text to create first ledger",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "Livro-razão criado com sucesso",
    description: "Toast notification when ledger created",
  },
};

export default ptWelcomePage;
