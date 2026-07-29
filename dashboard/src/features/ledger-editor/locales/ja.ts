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
    "ledgerEditor.createNewFile": {
      message: "新しいファイルを作成",
      description: "Tooltip for create file button",
    },
    "ledgerEditor.deleteFile": {
      message: "ファイルを削除",
      description: "Menu item to delete file",
    },
    "ledgerEditor.downloadFile": {
      message: "ファイルをダウンロード",
      description: "Menu item to download file",
    },
    "ledgerEditor.editFile": {
      message: "ファイルを編集",
      description: "Menu item to edit file",
    },
    "ledgerEditor.editor": {
      message: "エディター",
      description: "Navigation label for file editor",
    },
    "ledgerEditor.failedToLoadDirectory": {
      message: "ディレクトリの内容の読み込みに失敗しました",
      description: "Error message for directory loading",
    },
    "ledgerEditor.failedToSaveFile": {
      message: "ファイルの保存に失敗しました",
      description: "Error message when file save fails",
    },
    "ledgerEditor.files": {
      message: "ファイル",
      description: "Ledger files management",
    },
    "ledgerEditor.gitClone": {
      message: "Gitクローン",
      description: "Button text for git clone",
    },
    "ledgerEditor.goBackDirectory": {
      message: "戻る",
      description: "Tooltip for go back to parent directory",
    },
    "ledgerEditor.root": {
      message: "ルート",
      description: "Root directory in breadcrumb",
    },
    "ledgerEditor.updateFiles": {
      message: "ファイルを更新",
      description: "Button label to update files",
    },
    "ledgerEditor.uploadFiles": {
      message: "ファイルをアップロード",
      description: "Button label to upload files",
    },
    "ledgerEditor.uploadFilesButton": {
      message: "{count}個のファイルをアップロード",
      description:
        "Button label to upload files (contains {count} placeholder, add 's' for plural in component)",
    },
  };

export default {
  ...jaDirectoryBrowse,
  ...jaFileEditor,
  ...jaCreateFile,
  ...jaUploadFiles,
  ...jaLedgerEditor,
};
