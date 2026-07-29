import enDirectoryBrowse from "../directory-browse/locales/en";
import enFileEditor from "../file-editor/locales/en";
import enCreateFile from "../create-file/locales/en";
import enUploadFiles from "../upload-files/locales/en";

const enLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Create File",
      description: "Button label to create file",
    },
    "ledgerEditor.createNewFile": {
      message: "Create new file",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "Delete file",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "Download file",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "Edit file",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "Editor",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "Failed to load directory contents",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "Failed to save file",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "Files",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Git Clone",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "Go back",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "Root",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "Update Files",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "Upload Files",
      description: "Button label to upload files",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "Upload {count} file",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...enDirectoryBrowse,
  ...enFileEditor,
  ...enCreateFile,
  ...enUploadFiles,
  ...enLedgerEditor,
};
