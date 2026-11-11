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
  "ledgerEditor.deleteFileIncluded": {
    message:
      "Die Datei „{filename}“ wird von {includers} eingebunden. Die Einbindung entfernen und die Datei löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
    description:
      "Confirmation shown when a file other ledger files still include is deleted; {filename} is the file, {includers} the files that include it",
  },
  "ledgerEditor.deleteFileRemoveInclude": {
    message: "Einbindung entfernen und löschen",
    description:
      "Button that deletes a file and also removes the include lines that point at it",
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
  "ledgerEditor.saveConflict": {
    message:
      "Diese Datei wurde geändert, seit Sie sie geöffnet haben, daher wurde Ihre Bearbeitung nicht gespeichert. Kopieren Sie Ihre Bearbeitung, laden Sie dann die neueste Version und übernehmen Sie sie dort.",
    description:
      "Inline notice when a file save was refused because another write changed the file since it was opened",
  },
  "ledgerEditor.copyMyEdit": {
    message: "Meine Bearbeitung kopieren",
    description:
      "Copies the unsaved file edit to the clipboard after a conflicting save",
  },
  "ledgerEditor.loadLatest": {
    message: "Neueste laden",
    description:
      "Opens a confirmation to replace the unsaved edit with the file's latest revision",
  },
  "ledgerEditor.loadLatestTitle": {
    message: "Ihre Bearbeitung durch die neueste Version ersetzen?",
    description:
      "Title of the confirmation before replacing the unsaved edit with the latest revision",
  },
  "ledgerEditor.loadLatestDescription": {
    message:
      "Der Editor zeigt die Datei so, wie sie jetzt ist. Ihre ungespeicherte Bearbeitung geht verloren, sofern Sie sie nicht kopiert haben.",
    description:
      "Explains that loading the latest revision replaces the unsaved edit",
  },
  "ledgerEditor.loadLatestConfirm": {
    message: "Meine Bearbeitung ersetzen",
    description: "Confirms replacing the unsaved edit with the latest revision",
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
