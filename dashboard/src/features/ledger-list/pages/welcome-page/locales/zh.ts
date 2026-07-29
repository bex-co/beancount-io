export interface TranslationEntry {
  message: string;
  description: string;
}

const zhWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message: "创建一个新的 Beancount 账本来开始管理你的财务。",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "创建你的第一个账本",
    description: "Button text to create first ledger",
  },
  "page.welcome.failedToCreateLedger": {
    message: "创建账本失败",
    description: "Error message when ledger creation fails",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "账本创建成功",
    description: "Toast notification when ledger created",
  },
};

export default zhWelcomePage;
