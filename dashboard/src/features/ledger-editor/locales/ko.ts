import koDirectoryBrowse from "../directory-browse/locales/ko";
import koFileEditor from "../file-editor/locales/ko";
import koCreateFile from "../create-file/locales/ko";
import koUploadFiles from "../upload-files/locales/ko";

const koLedgerEditor: Record<string, { message: string; description: string }> =
  {
    "ledgerEditor.createFile": {
      message: "파일 생성",
      description: "Button label to create file",
    },
    "ledgerEditor.files": {
      message: "파일",
      description: "Ledger files management",
    },
    "ledgerEditor.uploadFiles": {
      message: "파일 업로드",
      description: "Button label to upload files",
    },
  };

export default {
  ...koDirectoryBrowse,
  ...koFileEditor,
  ...koCreateFile,
  ...koUploadFiles,
  ...koLedgerEditor,
};
