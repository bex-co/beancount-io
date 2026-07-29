export interface TranslationEntry {
  message: string;
  description: string;
}

const frDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "et toutes ses données.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "Cette action ne peut pas être annulée. Ceci supprimera définitivement le grand livre et toutes les données associées.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "Avertissement",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "pour confirmer",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "Actions irréversibles pouvant entraîner une perte de données",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "Tapez",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "La suppression d'un grand livre est permanente et ne peut pas être annulée. Toutes les données, y compris les transactions, les documents et l'historique seront perdues.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "Ceci supprimera définitivement",
    description: "Prefix for delete confirmation message",
  },
};

export default frDangerZoneSection;
