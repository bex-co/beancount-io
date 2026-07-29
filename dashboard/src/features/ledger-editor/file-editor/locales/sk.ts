const skFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "Zarovnať sumy",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      'Ste si istí, že chcete vymazať "{filename}"? Túto akciu nie je možné vrátiť späť.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "Vymazať súbor",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToDeleteFile": {
    message: "Vymazanie súboru zlyhalo",
    description: "Error message when file deletion fails",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Načítanie obsahu súboru zlyhalo",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Súbor bol úspešne vymazaný",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Súbor bol úspešne uložený",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "Zbaliť všetko",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "Odísť bez uloženia",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "Načítavam obsah súboru...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "Zostať",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "Prepnúť komentár",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "Rozbaliť všetko",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "Neuložené zmeny",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message:
      "Máte neuložené zmeny. Ste si istí, že chcete odísť? Vaše zmeny budú stratené.",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "Nepodporovaný formát súboru",
    description: "Message shown for files that cannot be displayed",
  },
};

export default skFileEditor;
