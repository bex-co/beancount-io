import deDirectoryBrowse from "../directory-browse/locales/de";
import deFileEditor from "../file-editor/locales/de";
import deCreateFile from "../create-file/locales/de";
import deUploadFiles from "../upload-files/locales/de";

const deLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Datei erstellen",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "Dateien",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Dateien hochladen",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...deDirectoryBrowse,
  ...deFileEditor,
  ...deCreateFile,
  ...deUploadFiles,
  ...deLedgerEditor,
};
