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
    "ledgerEditor.createNewFile": {
      message: "Vytvoriť nový súbor",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "Vymazať súbor",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "Stiahnuť súbor",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "Upraviť súbor",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "Editor",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "Nepodarilo sa načítať obsah priečinka",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "Uloženie súboru zlyhalo",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "Súbory",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Git Klonovanie",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "Ísť späť",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "Koreň",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "Aktualizovať súbory",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "Nahrať súbory",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "Nahrať {count} súbor",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...skDirectoryBrowse,
  ...skFileEditor,
  ...skCreateFile,
  ...skUploadFiles,
  ...skLedgerEditor,
};
