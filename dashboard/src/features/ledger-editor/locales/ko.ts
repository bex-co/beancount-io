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
  "ledgerEditor.gitClone": {
    message: "Git 복제",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "디렉터리 내용을 로드하지 못했습니다.",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "파일 내용이 비어 있습니다.",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "이미지 콘텐츠를 표시할 수 없습니다",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message: "이 파일 형식({type})은 미리보기가 지원되지 않습니다.",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "이 파일 형식은 미리보기가 지원되지 않습니다.",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.createFileCommit": {
    message: "파일 만들기 {path}",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "업데이트 파일 {path}",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "파일 삭제 {path}",
    description: "Generated commit message for deleting a file",
  },
};
