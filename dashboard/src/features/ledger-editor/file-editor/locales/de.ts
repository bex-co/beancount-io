const deFileEditor: Record<string, { message: string; description: string }> = {
  "ledgerEditor.rootFileCannotBeDeleted": {
    message:
      "{filename} ist die Stammdatei des Hauptbuchs und kann nicht gelöscht werden",
    description:
      "Why Delete is unavailable for the ledger's root file, which the server refuses to delete; {filename} is main.bean",
  },
  "ledgerEditor.fileDownloadFailed": {
    message:
      "{filename} konnte nicht zum Herunterladen vorbereitet werden. Bitte versuchen Sie es erneut.",
    description:
      "Error toast when the browser could not generate a file's local download; the file is unchanged and Download can be tried again. {filename} is the file's name",
  },
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
  "ledgerEditor.fileNotFound": {
    message: "Datei nicht gefunden: {path}",
    description:
      "Meldung, wenn ein Ledger-Dateipfad nicht existiert (enthält {path})",
  },
  "ledgerEditor.browseParentDirectory": {
    message: "Übergeordnetes Verzeichnis öffnen",
    description:
      "Schaltfläche zum Öffnen des übergeordneten Files-Verzeichnisses nach fehlender Datei",
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
