import ptDirectoryBrowse from "../directory-browse/locales/pt";
import ptFileEditor from "../file-editor/locales/pt";
import ptCreateFile from "../create-file/locales/pt";
import ptUploadFiles from "../upload-files/locales/pt";

const ptLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Criar Arquivo",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "Arquivos",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Enviar arquivos",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...ptDirectoryBrowse,
  ...ptFileEditor,
  ...ptCreateFile,
  ...ptUploadFiles,
  ...ptLedgerEditor,
};
