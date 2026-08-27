import caDirectoryBrowse from "../directory-browse/locales/ca";
import caFileEditor from "../file-editor/locales/ca";
import caCreateFile from "../create-file/locales/ca";
import caUploadFiles from "../upload-files/locales/ca";

const caLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Crear fitxer",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "Fitxers",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Actualitzar fitxers",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...caDirectoryBrowse,
  ...caFileEditor,
  ...caCreateFile,
  ...caUploadFiles,
  ...caLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Git Clone",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "No s'ha pogut carregar el contingut del directori",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "El contingut del fitxer és buit",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "No es pot mostrar el contingut de la imatge",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message:
      "Aquest tipus de fitxer ({type}) no és compatible per a la previsualització",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message:
      "Aquest tipus de fitxer no és compatible per a la previsualització",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.createFileCommit": {
    message: "Crea un fitxer {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Actualitza el fitxer {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Suprimeix el fitxer {path}",
    description: "Generated commit message for deleting a file",
  },
};
