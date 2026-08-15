import jaDirectoryBrowse from "../directory-browse/locales/ja";
import jaFileEditor from "../file-editor/locales/ja";
import jaCreateFile from "../create-file/locales/ja";
import jaUploadFiles from "../upload-files/locales/ja";

const jaLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "ファイルを作成",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "ファイル",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "ファイルをアップロード",
      description: "Button label to upload files",
    },
  };

export default {
  ...jaDirectoryBrowse,
  ...jaFileEditor,
  ...jaCreateFile,
  ...jaUploadFiles,
  ...jaLedgerEditor,
};
