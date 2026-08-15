export interface TranslationEntry {
  message: string;
  description: string;
}

const koWelcomePage: Record<string, TranslationEntry> = {
  "page.welcome.createNewLedgerDescription": {
    message: "재무를 관리하기 위한 새 Beancount 장부를 만드세요.",
    description: "Description in create ledger dialog",
  },
  "page.welcome.createYourFirstLedger": {
    message: "첫 번째 장부 만들기",
    description: "Button text to create first ledger",
  },
  "page.welcome.ledgerCreatedSuccess": {
    message: "장부가 성공적으로 생성되었습니다",
    description: "Toast notification when ledger created",
  },
};

export default koWelcomePage;
