import faDirectoryBrowse from "../directory-browse/locales/fa";
import faFileEditor from "../file-editor/locales/fa";
import faCreateFile from "../create-file/locales/fa";
import faUploadFiles from "../upload-files/locales/fa";

const faLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "ایجاد فایل",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "فایل‌ها",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "بارگذاری فایل‌ها",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...faDirectoryBrowse,
  ...faFileEditor,
  ...faCreateFile,
  ...faUploadFiles,
  ...faLedgerEditor,
};
