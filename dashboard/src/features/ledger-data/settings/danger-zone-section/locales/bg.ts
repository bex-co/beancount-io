export interface TranslationEntry {
  message: string;
  description: string;
}

const bgDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "и всички данни към нея.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "Това действие не може да бъде отменено. Това ще изтрие окончателно книгата и всички свързани с нея данни.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "Предупреждение",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "за потвърждение",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "Необратими действия, които могат да доведат до загуба на данни",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "Въведете",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "Изтриването на книга е окончателно и не може да бъде отменено. Всички данни, включително транзакции, документи и история, ще бъдат загубени.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "Това ще изтрие окончателно",
    description: "Prefix for delete confirmation message",
  },
};

export default bgDangerZoneSection;
