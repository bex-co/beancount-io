export interface TranslationEntry {
  message: string;
  description: string;
}

const jaWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message: "財務管理を始めるための新しいBeancountの台帳を作成します。",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "最初の台帳を作成",
    description: "Button text to create first ledger",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "台帳が正常に作成されました",
    description: "Toast notification when ledger created",
  },
};

export default jaWelcomePage;
