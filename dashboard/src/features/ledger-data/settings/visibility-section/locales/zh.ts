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
  "page.settings.embedViewOnBeancount": {
    message: "在 Beancount.io 上查看",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "复制 URL 失败",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "复制代码失败",
    description: "Toast when copying the embed code failed",
  },
};

export default zhVisibilitySection;
