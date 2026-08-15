const deFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.alignAmounts": {
    message: "Beträge ausrichten",
    description: "Menu item to align amounts in editor",
  },
  "ledgerEditor.deleteFileConfirmation": {
    message:
      'Sind Sie sicher, dass Sie "{filename}" löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
    description:
      "Confirmation message for file deletion (contains {filename} placeholder)",
  },
  "ledgerEditor.deleteFileTitle": {
    message: "Datei löschen",
    description: "Dialog title for file deletion",
  },
  "ledgerEditor.failedToLoadFileContent": {
    message: "Dateiinhalt konnte nicht geladen werden",
    description: "Error message when file content fails to load",
  },
  "ledgerEditor.fileDeletedSuccess": {
    message: "Datei erfolgreich gelöscht",
    description: "Success message when file is deleted",
  },
  "ledgerEditor.fileSavedSuccess": {
    message: "Datei erfolgreich gespeichert",
    description: "Success message when file is saved",
  },
  "ledgerEditor.foldAll": {
    message: "Alle einklappen",
    description: "Menu item to fold all sections in editor",
  },
  "ledgerEditor.leaveWithoutSaving": {
    message: "Ohne Speichern verlassen",
    description: "Button to leave page without saving changes",
  },
  "ledgerEditor.loadingFileContent": {
    message: "Dateiinhalt wird geladen...",
    description: "Loading message while fetching file content",
  },
  "ledgerEditor.stay": {
    message: "Bleiben",
    description: "Button to stay on current page with unsaved changes",
  },
  "ledgerEditor.toggleComment": {
    message: "Kommentar umschalten",
    description: "Menu item to toggle comment in editor",
  },
  "ledgerEditor.unfoldAll": {
    message: "Alle ausklappen",
    description: "Menu item to unfold all sections in editor",
  },
  "ledgerEditor.unsavedChanges": {
    message: "Nicht gespeicherte Änderungen",
    description: "Dialog title for unsaved changes warning",
  },
  "ledgerEditor.unsavedChangesMessage": {
    message:
      "Sie haben nicht gespeicherte Änderungen. Sind Sie sicher, dass Sie die Seite verlassen möchten? Ihre Änderungen gehen verloren.",
    description: "Warning message about losing unsaved changes",
  },
  "ledgerEditor.unsupportedFileFormat": {
    message: "Nicht unterstütztes Dateiformat",
    description: "Message shown for files that cannot be displayed",
  },
};

export default deFileEditor;
