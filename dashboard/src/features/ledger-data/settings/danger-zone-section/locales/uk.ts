export interface TranslationEntry {
  message: string;
  description: string;
}

const ukDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "та всі його дані.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "Цю дію неможливо скасувати. Це назавжди видалить книгу та всі пов'язані дані.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "Попередження",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "для підтвердження",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "Незворотні дії, які можуть призвести до втрати даних",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "Тип",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "Вeleting a ledger is permanent and cannot be undone. All data, including transactions, documents, and history will be lost.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "Це назавжди видалить",
    description: "Prefix for delete confirmation message",
  },
};

export default ukDangerZoneSection;
