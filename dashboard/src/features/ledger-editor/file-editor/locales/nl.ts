const nlFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.rootFileCannotBeDeleted": {
    message:
      "{filename} is het hoofdbestand van het grootboek en kan niet worden verwijderd",
    description:
      "Why Delete is unavailable for the ledger's root file, which the server refuses to delete; {filename} is main.bean",
  },
  "ledgerEditor.fileDownloadFailed": {
    message:
      "Kan {filename} niet voorbereiden voor download. Probeer het opnieuw.",
    description:
      "Error toast when the browser could not generate a file's local download; the file is unchanged and Download can be tried again. {filename} is the file's name",
  },
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
  "ledgerEditor.failedToLoadFileContent": {
    message: "Bestandsinhoud laden mislukt",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileNotFound": {
    message: "Bestand niet gevonden: {path}",
    description:
      "Bericht wanneer een ledger-bestandspad niet bestaat (bevat {path})",
  },
  "ledgerEditor.browseParentDirectory": {
    message: "Bovenliggende map openen",
    description:
      "Knop om de bovenliggende Files-map te openen na een ontbrekend bestand",
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
