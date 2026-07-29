const nlFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "Bedragen uitlijnen",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      'Weet u zeker dat u "{filename}" wilt verwijderen? Deze actie kan niet ongedaan gemaakt worden.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "Bestand verwijderen",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToDeleteFile": {
    message: "Bestand verwijderen mislukt",
    description: "Error message when file deletion fails",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Bestandsinhoud laden mislukt",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Bestand succesvol verwijderd",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Bestand succesvol opgeslagen",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "Alles inklappen",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "Verlaten zonder opslaan",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "Bestandsinhoud laden...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "Blijven",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "Commentaar aan/uit",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "Alles uitklappen",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "Niet-opgeslagen wijzigingen",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message:
      "U heeft niet-opgeslagen wijzigingen. Weet u zeker dat u wilt vertrekken? Uw wijzigingen gaan verloren.",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "Niet-ondersteund bestandsformaat",
    description: "Message shown for files that cannot be displayed",
  },
};

export default nlFileEditor;
