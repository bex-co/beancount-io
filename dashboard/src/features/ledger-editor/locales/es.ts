import esDirectoryBrowse from "../directory-browse/locales/es";
import esFileEditor from "../file-editor/locales/es";
import esCreateFile from "../create-file/locales/es";
import esUploadFiles from "../upload-files/locales/es";

const esLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Crear Archivo",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "Archivos",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Cargar archivos",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...esDirectoryBrowse,
  ...esFileEditor,
  ...esCreateFile,
  ...esUploadFiles,
  ...esLedgerEditor,
};
