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
};
