export interface TranslationEntry {
  message: string;
  description: string;
}

const enDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "and all of its data.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "This action cannot be undone. This will permanently delete the ledger and all associated data.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "Warning",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "to confirm",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "Irreversible actions that can cause data loss",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "Type",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "Deleting a ledger is permanent and cannot be undone. All data, including transactions, documents, and history will be lost.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "This will permanently delete",
    description: "Prefix for delete confirmation message",
  },
};

export default enDangerZoneSection;
