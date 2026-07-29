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
    "ledgerEditor.createNewFile": {
      message: "새 파일 만들기",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "파일 삭제",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "파일 다운로드",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "파일 편집",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "편집기",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "디렉터리 내용 불러오기 실패",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "파일 저장 실패",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "파일",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Git 복제",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "뒤로 가기",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "루트",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "파일 업데이트",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "파일 업로드",
      description: "Button label to upload files",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "{count}개 파일 업로드",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...koDirectoryBrowse,
  ...koFileEditor,
  ...koCreateFile,
  ...koUploadFiles,
  ...koLedgerEditor,
};
