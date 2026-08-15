import frDirectoryBrowse from "../directory-browse/locales/fr";
import frFileEditor from "../file-editor/locales/fr";
import frCreateFile from "../create-file/locales/fr";
import frUploadFiles from "../upload-files/locales/fr";

const frLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Créer un fichier",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "Fichiers",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Téléverser des fichiers",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...frDirectoryBrowse,
  ...frFileEditor,
  ...frCreateFile,
  ...frUploadFiles,
  ...frLedgerEditor,
};
