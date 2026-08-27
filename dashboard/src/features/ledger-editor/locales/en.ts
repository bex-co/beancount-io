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
    "ledgerEditor.files": {
      message: "Files",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Upload Files",
      description: "Button label to upload files",
    },
  };

export default {
  ...enDirectoryBrowse,
  ...enFileEditor,
  ...enCreateFile,
  ...enUploadFiles,
  ...enLedgerEditor,
  "ledgerEditor.gitClone": {
    message: "Git Clone",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "Failed to load directory contents",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "File content is empty",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "Unable to display image content",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message: "This file type ({type}) is not supported for preview",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "This file type is not supported for preview",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.createFileCommit": {
    message: "Create file {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "Update file {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "Delete file {path}",
    description: "Generated commit message for deleting a file",
  },
};
