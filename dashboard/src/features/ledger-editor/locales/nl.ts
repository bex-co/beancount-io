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
    "ledgerEditor.files": {
      message: "Bestanden",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Bestanden uploaden",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...nlDirectoryBrowse,
  ...nlFileEditor,
  ...nlCreateFile,
  ...nlUploadFiles,
  ...nlLedgerEditor,
};
