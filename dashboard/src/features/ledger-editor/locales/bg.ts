import bgDirectoryBrowse from "../directory-browse/locales/bg";
import bgFileEditor from "../file-editor/locales/bg";
import bgCreateFile from "../create-file/locales/bg";
import bgUploadFiles from "../upload-files/locales/bg";

const bgLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Създаване на файл",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "Файлове",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Качване на файлове",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...bgDirectoryBrowse,
  ...bgFileEditor,
  ...bgCreateFile,
  ...bgUploadFiles,
  ...bgLedgerEditor,
};
