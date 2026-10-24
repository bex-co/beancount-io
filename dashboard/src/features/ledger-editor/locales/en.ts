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
    "ledgerEditor.branchNotFound": {
      message:
        "Branch “{branch}” isn't available here. Files are shown from {main}.",
      description:
        "404 for a Files URL naming a branch other than the supported one (contains {branch} and {main})",
    },
    "ledgerEditor.browseMainFiles": {
      message: "Browse files on {main}",
      description:
        "Link to the Files root on the supported branch (contains {main})",
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
  "ledgerEditor.notUtf8Text": {
    message:
      "This file isn't UTF-8 text, so it can't be shown or edited here without changing its bytes. Download it to open it elsewhere.",
    description:
      "Shown instead of the editor for a text file whose bytes are not valid UTF-8",
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
  "ledgerEditor.folderNamesChecking": {
    message: "Checking the names already in this folder…",
    description:
      "Shown while a create or upload form waits for the target folder's existing names before allowing the write",
  },
  "ledgerEditor.folderNamesFailed": {
    message: "Couldn't check the names already in this folder.",
    description:
      "Shown with Try Again when reading the target folder's existing names failed, so a name clash cannot be ruled out",
  },
};
