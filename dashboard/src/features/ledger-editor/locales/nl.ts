import nlDirectoryBrowse from "../directory-browse/locales/nl";
import nlFileEditor from "../file-editor/locales/nl";
import nlCreateFile from "../create-file/locales/nl";
import nlUploadFiles from "../upload-files/locales/nl";

const nlLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Bestand aanmaken",
      description: "Button label to create file",
    },
    "ledgerEditor.createNewFile": {
      message: "Nieuw bestand aanmaken",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "Verwijderen file",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "Bestand downloaden",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "Bewerken file",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "Bewerkenor",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "Map laden mislukt",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "Bestand opslaan mislukt",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "Bestanden",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Git klonen",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "Terug",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "Root",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "Bestanden bijwerken",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "Bestanden uploaden",
      description: "Tooltip for upload files button",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "{count} bestand uploaden",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...nlDirectoryBrowse,
  ...nlFileEditor,
  ...nlCreateFile,
  ...nlUploadFiles,
  ...nlLedgerEditor,
};
