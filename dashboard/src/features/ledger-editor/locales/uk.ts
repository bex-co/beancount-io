import ukDirectoryBrowse from "../directory-browse/locales/uk";
import ukFileEditor from "../file-editor/locales/uk";
import ukCreateFile from "../create-file/locales/uk";
import ukUploadFiles from "../upload-files/locales/uk";

const ukLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Створити файл",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "Файлs",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Завантажити файли",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...ukDirectoryBrowse,
  ...ukFileEditor,
  ...ukCreateFile,
  ...ukUploadFiles,
  ...ukLedgerEditor,
};
