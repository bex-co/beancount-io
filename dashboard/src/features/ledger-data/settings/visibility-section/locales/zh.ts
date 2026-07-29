export interface TranslationEntry {
  message: string;
  description: string;
}

const zhVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "公开账本",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message: "你的账本是公开的。任何拥有链接的人都可以查看它。",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "嵌入代码",
    description: "Label for embed code field",
  },
  "page.settings.copyUrl": {
    message: "复制链接",
    description: "Button text for copying URL",
  },
  "page.settings.failedToUpdateVisibility": {
    message: "更新账本可见性失败",
    description: "Error message when visibility update fails",
  },
  "page.settings.copied": {
    message: "已复制！",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "可见性",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "控制谁可以访问你的账本",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "与他人分享你的公开账本",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "分享链接",
    description: "Label for shareable URL field",
  },
  "page.settings.sharingOnlyPublic": {
    message: "只有公开账本才能分享。请在上方更改账本可见性以启用分享功能。",
    description: "Info message when ledger is private",
  },
  "page.settings.sharing": {
    message: "公开分享",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message: "你的账本是私有的。只有你和协作者可以访问它。",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "私有账本",
    description: "Label when ledger is private",
  },
  "page.settings.copyCode": {
    message: "复制代码",
    description: "Button text for copying embed code",
  },
};

export default zhVisibilitySection;
