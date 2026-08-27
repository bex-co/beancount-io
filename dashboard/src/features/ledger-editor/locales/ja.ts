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
  "ledgerEditor.gitClone": {
    message: "Git クローン",
    description: "Button for opening Git clone options",
  },
  "ledgerEditor.failedToLoadDirectory": {
    message: "ディレクトリの内容をロードできませんでした",
    description: "Error shown when a ledger directory cannot load",
  },
  "ledgerEditor.fileContentEmpty": {
    message: "ファイルの内容が空です",
    description: "Empty state for a file without content",
  },
  "ledgerEditor.unableToDisplayImage": {
    message: "画像コンテンツを表示できません",
    description: "Error shown when image content cannot be displayed",
  },
  "ledgerEditor.unsupportedPreviewWithType": {
    message:
      "このファイル タイプ ({type}) はプレビューではサポートされていません",
    description: "Unsupported preview message including the file type",
  },
  "ledgerEditor.unsupportedPreview": {
    message: "このファイル タイプはプレビューではサポートされていません",
    description: "Unsupported preview message without a file type",
  },
  "ledgerEditor.createFileCommit": {
    message: "ファイル {path} を作成します",
    description: "Generated commit message for creating a file",
  },
  "ledgerEditor.updateFileCommit": {
    message: "ファイル {path} を更新します",
    description: "Generated commit message for updating a file",
  },
  "ledgerEditor.deleteFileCommit": {
    message: "ファイル {path} を削除します",
    description: "Generated commit message for deleting a file",
  },
};
