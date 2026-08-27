import skDirectoryBrowse from "../directory-browse/locales/sk";
import skFileEditor from "../file-editor/locales/sk";
import skCreateFile from "../create-file/locales/sk";
import skUploadFiles from "../upload-files/locales/sk";

const skLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Vytvoriť súbor",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "Súbory",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Nahrať súbory",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...skDirectoryBrowse,
  ...skFileEditor,
  ...skCreateFile,
  ...skUploadFiles,
  ...skLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Git Clone",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "Nepodarilo sa načítať obsah adresára",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "Obsah súboru je prázdny",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "Nie je možné zobraziť obsah obrázka",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message:
      "Tento typ súboru ({type}) nie je podporovaný na zobrazenie ukážky",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "Tento typ súboru nie je podporovaný na ukážku",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.createFileCommit": {
    message: "Vytvoriť súbor {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Aktualizovať súbor {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Odstrániť súbor {path}",
    description: "Generated commit message for deleting a file",
  },
};
