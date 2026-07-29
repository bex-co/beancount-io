export interface TranslationEntry {
  message: string;
  description: string;
}

const deDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "und alle zugehörigen Daten.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "Diese Aktion kann nicht rückgängig gemacht werden. Dies löscht das Hauptbuch und alle zugehörigen Daten dauerhaft.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "Warnung",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "zur Bestätigung",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "Unwiderrufliche Aktionen, die zu Datenverlust führen können",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "Eingeben",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "Das Löschen eines Hauptbuchs ist dauerhaft und kann nicht rückgängig gemacht werden. Alle Daten, einschließlich Transaktionen, Dokumente und Verlauf, gehen verloren.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "Dies wird dauerhaft löschen",
    description: "Prefix for delete confirmation message",
  },
};

export default deDangerZoneSection;
