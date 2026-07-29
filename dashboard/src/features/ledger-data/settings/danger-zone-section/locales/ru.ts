export interface TranslationEntry {
  message: string;
  description: string;
}

const ruDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "и все связанные данные.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "Это действие не может быть отменено. Книга и все связанные данные будут удалены навсегда.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "Предупреждение",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "для подтверждения",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "Необратимые действия, которые могут привести к потере данных",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "Введите",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "Удаление книги необратимо. Все данные, включая транзакции, документы и историю, будут утеряны.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "Это навсегда удалит",
    description: "Prefix for delete confirmation message",
  },
};

export default ruDangerZoneSection;
