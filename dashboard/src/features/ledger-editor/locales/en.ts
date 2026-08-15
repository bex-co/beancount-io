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
};
