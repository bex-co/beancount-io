import ruDirectoryBrowse from "../directory-browse/locales/ru";
import ruFileEditor from "../file-editor/locales/ru";
import ruCreateFile from "../create-file/locales/ru";
import ruUploadFiles from "../upload-files/locales/ru";

const ruLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "Создать файл",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "Файлы",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "Загрузить файлы",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...ruDirectoryBrowse,
  ...ruFileEditor,
  ...ruCreateFile,
  ...ruUploadFiles,
  ...ruLedgerEditor,
};
