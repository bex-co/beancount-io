import zhDirectoryBrowse from "../directory-browse/locales/zh";
import zhFileEditor from "../file-editor/locales/zh";
import zhCreateFile from "../create-file/locales/zh";
import zhUploadFiles from "../upload-files/locales/zh";

const zhLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "创建文件",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "文件",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "上传文件",
      description: "Tooltip for upload files button",
    },
  };

export default {
  ...zhDirectoryBrowse,
  ...zhFileEditor,
  ...zhCreateFile,
  ...zhUploadFiles,
  ...zhLedgerEditor,
};
