export interface TranslationEntry {
  message: string;
  description: string;
}

const faDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "و تمام داده‌های آن را.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "این عملیات قابل بازگشت نیست. دفتر و تمام داده‌های مرتبط به‌طور دائمی حذف خواهند شد.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "هشدار",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "برای تأیید",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message:
      "عملیات‌های غیرقابل بازگشت که می‌توانند موجب از دست رفتن داده شوند",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "تایپ کنید",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "حذف دفتر دائمی است و قابل بازگشت نیست. تمام داده‌ها، از جمله تراکنش‌ها، اسناد و تاریخچه از دست خواهند رفت.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "این عملیات به‌طور دائمی حذف خواهد کرد",
    description: "Prefix for delete confirmation message",
  },
};

export default faDangerZoneSection;
