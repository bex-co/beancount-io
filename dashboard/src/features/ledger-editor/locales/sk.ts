import skDirectoryBrowse from "../directory-browse/locales/sk";
import skFileEditor from "../file-editor/locales/sk";
import skCreateFile from "../create-file/locales/sk";
import skUploadFiles from "../upload-files/locales/sk";

const skLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Vytvoriť súbor",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "Súbory",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Nahrať súbory",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...skDirectoryBrowse,
  ...skFileEditor,
  ...skCreateFile,
  ...skUploadFiles,
  ...skLedgerEditor,
};
