export interface TranslationEntry {
  message: string;
  description: string;
}

const zhVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.makePublicTitle": {
    message: "要公开此账本吗？",
    description:
      "Title of the confirmation before a private ledger becomes public",
  },
  "page.settings.makePublicDescription": {
    message:
      "任何拥有链接的人以及搜索引擎都将能够查看此账本的交易、余额、文件和完整的提交历史，包括每个文件的所有早期版本，以及每次提交的作者姓名和邮箱。",
    description: "What becomes visible when a private ledger is made public",
  },
  "page.settings.makePublic": {
    message: "公开",
    description: "Button that confirms making a private ledger public",
  },
  "page.settings.publicLedger": {
    message: "公开账本",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message:
      "你的账本是公开的。任何拥有链接的人都可以查看它，包括完整的提交历史：每个文件的所有早期版本，以及每次提交的作者姓名和邮箱。",
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
  "page.settings.copyShareableUrl": {
    message: "复制可分享链接",
    description: "Accessible name for the button that copies the shareable URL",
  },
  "page.settings.copyEmbedCode": {
    message: "复制嵌入代码",
    description: "Accessible name for the button that copies the embed code",
  },
  "page.settings.visibilityDescriptionReadOnly": {
    message: "谁可以访问此账本。只有账本管理员可以更改。",
    description:
      "Visibility section description shown to viewers who cannot change it",
  },
  "page.settings.publicLedgerDescriptionReadOnly": {
    message: "此账本是公开的。任何拥有链接的人都可以查看。",
    description:
      "Public ledger state described to viewers who cannot change it",
  },
  "page.settings.privateLedgerDescriptionReadOnly": {
    message: "此账本是私有的。只有其所有者和协作者可以访问。",
    description:
      "Private ledger state described to viewers who cannot change it",
  },
};

export default zhVisibilitySection;
