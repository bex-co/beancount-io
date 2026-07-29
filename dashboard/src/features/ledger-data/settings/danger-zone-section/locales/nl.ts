export interface TranslationEntry {
  message: string;
  description: string;
}

const nlDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "en alle bijbehorende gegevens.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "Deze actie kan niet ongedaan gemaakt worden. Dit zal het grootboek en alle bijbehorende gegevens permanent verwijderen.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "Waarschuwing",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "om te bevestigen",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "Onomkeerbare acties die gegevensverlies kunnen veroorzaken",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "Typ",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "Een grootboek verwijderen is permanent en kan niet ongedaan gemaakt worden. Alle gegevens, inclusief transacties, documenten en geschiedenis gaan verloren.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "Dit zal permanent verwijderen",
    description: "Prefix for delete confirmation message",
  },
};

export default nlDangerZoneSection;
