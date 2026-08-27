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
    "ledgerEditor.files": {
      message: "Dateien",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Dateien hochladen",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...deDirectoryBrowse,
  ...deFileEditor,
  ...deCreateFile,
  ...deUploadFiles,
  ...deLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Git-Klon",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "Verzeichnisinhalt konnte nicht geladen werden",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "Dateiinhalt ist leer",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "Bildinhalt kann nicht angezeigt werden",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message: "Dieser Dateityp ({type}) wird für die Vorschau nicht unterstützt",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "Dieser Dateityp wird für die Vorschau nicht unterstützt",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.createFileCommit": {
    message: "Datei erstellen {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Datei aktualisieren {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Datei löschen {path}",
    description: "Generated commit message for deleting a file",
  },
};
