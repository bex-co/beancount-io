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
  "page.settings.copyUrl": {
    message: "Copy URL",
    description: "Button text for copying URL",
  },
  "page.settings.failedToUpdateVisibility": {
    message: "Failed to update ledger visibility",
    description: "Error message when visibility update fails",
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
  "page.settings.sharingOnlyPublic": {
    message:
      "Sharing is only available for public ledgers. Change your ledger visibility above to enable sharing.",
    description: "Info message when ledger is private",
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
  "page.settings.copyCode": {
    message: "Copy Code",
    description: "Button text for copying embed code",
  },
};

export default enVisibilitySection;
