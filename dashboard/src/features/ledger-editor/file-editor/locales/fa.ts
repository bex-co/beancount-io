const faFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "تراز کردن مبالغ",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      'آیا مطمئن هستید که می‌خواهید "{filename}" را حذف کنید؟ این عملیات قابل بازگشت نیست.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "حذف فایل",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToDeleteFile": {
    message: "حذف فایل ناموفق بود",
    description: "Error message when file deletion fails",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "بارگذاری محتوای فایل ناموفق بود",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "فایل با موفقیت حذف شد",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "فایل با موفقیت ذخیره شد",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "جمع کردن همه",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "خروج بدون ذخیره",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "در حال بارگذاری محتوای فایل...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "ماندن",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "تبدیل به توضیح",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "باز کردن همه",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "تغییرات ذخیره نشده",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message:
      "شما تغییراتی ذخیره نشده دارید. آیا مطمئن هستید که می‌خواهید خارج شوید؟ تغییرات شما از دست خواهد رفت.",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "فرمت فایل پشتیبانی نمی‌شود",
    description: "Message shown for files that cannot be displayed",
  },
};

export default faFileEditor;
