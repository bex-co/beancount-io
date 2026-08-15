export interface TranslationEntry {
  message: string;
  description: string;
}

const jaVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "公開元帳",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message: "元帳は公開されています。リンクがある人は誰でも閲覧できます。",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "埋め込みコード",
    description: "Label for embed code field",
  },
  "page.settings.copied": {
    message: "コピーしました！",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "公開設定",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "元帳へのアクセスを制御する",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "公開元帳を他の人と共有する",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "共有可能なURL",
    description: "Label for shareable URL field",
  },
  "page.settings.sharing": {
    message: "公開共有",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message: "元帳は非公開です。あなたとコラボレーターのみがアクセスできます。",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "非公開元帳",
    description: "Label when ledger is private",
  },
  "page.settings.embedViewOnBeancount": {
    message: "Beancount.ioで表示",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "URLのコピーに失敗しました",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "コードのコピーに失敗しました",
    description: "Toast when copying the embed code failed",
  },
};

export default jaVisibilitySection;
