export interface TranslationEntry {
  message: string;
  description: string;
}

const enVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "Public Ledger",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message: "Your ledger is public. Anyone with the link can view it.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "Embed Code",
    description: "Label for embed code field",
  },
  "page.settings.copied": {
    message: "Copied!",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "Visibility",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "Control who can access your ledger",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "Share your public ledger with others",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "Shareable URL",
    description: "Label for shareable URL field",
  },
  "page.settings.sharing": {
    message: "Public Sharing",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message:
      "Your ledger is private. Only you and collaborators can access it.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "Private Ledger",
    description: "Label when ledger is private",
  },
  "page.settings.embedViewOnBeancount": {
    message: "View on Beancount.io",
    description:
      "Link label in the generated embed code pointing back to Beancount.io",
  },
  "page.settings.copyUrlFailed": {
    message: "Failed to copy URL",
    description: "Toast when copying the shareable URL failed",
  },
  "page.settings.copyCodeFailed": {
    message: "Failed to copy code",
    description: "Toast when copying the embed code failed",
  },
};

export default enVisibilitySection;
