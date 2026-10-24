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
    "ledgerEditor.branchNotFound": {
      message:
        "ブランチ「{branch}」はここでは利用できません。ファイルは {main} から表示されます。",
      description:
        "404 for a Files URL naming a branch other than the supported one (contains {branch} and {main})",
    },
    "ledgerEditor.browseMainFiles": {
      message: "{main} のファイルを表示",
      description:
        "Link to the Files root on the supported branch (contains {main})",
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
  "ledgerEditor.notUtf8Text": {
    message:
      "このファイルは UTF-8 テキストではないため、バイトを変更せずにここで表示・編集することはできません。ダウンロードして別のアプリで開いてください。",
    description:
      "Shown instead of the editor for a text file whose bytes are not valid UTF-8",
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
  "ledgerEditor.folderNamesChecking": {
    message: "このフォルダーにある名前を確認しています…",
    description:
      "Shown while a create or upload form waits for the target folder's existing names before allowing the write",
  },
  "ledgerEditor.folderNamesFailed": {
    message: "このフォルダーにある名前を確認できませんでした。",
    description:
      "Shown with Try Again when reading the target folder's existing names failed, so a name clash cannot be ruled out",
  },
};
