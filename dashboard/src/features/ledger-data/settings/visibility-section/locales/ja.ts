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
  "page.settings.copyUrl": {
    message: "URLをコピー",
    description: "Button text for copying URL",
  },
  "page.settings.failedToUpdateVisibility": {
    message: "元帳の公開設定の更新に失敗しました",
    description: "Error message when visibility update fails",
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
  "page.settings.sharingOnlyPublic": {
    message:
      "共有は公開元帳でのみ利用可能です。共有を有効にするには上記で元帳の公開設定を変更してください。",
    description: "Info message when ledger is private",
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
  "page.settings.copyCode": {
    message: "コードをコピー",
    description: "Button text for copying embed code",
  },
};

export default jaVisibilitySection;
