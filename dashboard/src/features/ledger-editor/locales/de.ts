import deDirectoryBrowse from "../directory-browse/locales/de";
import deFileEditor from "../file-editor/locales/de";
import deCreateFile from "../create-file/locales/de";
import deUploadFiles from "../upload-files/locales/de";

const deLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Datei erstellen",
      description: "Button label to create file",
    },
    "ledgerEditor.createNewFile": {
      message: "Neue Datei erstellen",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "Datei löschen",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "Datei herunterladen",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "Datei bearbeiten",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "Editor",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "Verzeichnisinhalt konnte nicht geladen werden",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "Datei konnte nicht gespeichert werden",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "Dateien",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Git Clone",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "Zurück",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "Stammverzeichnis",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "Dateien aktualisieren",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "Dateien hochladen",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "{count} Datei hochladen",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...deDirectoryBrowse,
  ...deFileEditor,
  ...deCreateFile,
  ...deUploadFiles,
  ...deLedgerEditor,
};
