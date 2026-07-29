const jaDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "リポジトリをクローン",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "ZIPでダウンロード",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.loadingDirectoryContents": {
    message: "ディレクトリの内容を読み込み中...",
    description: "Loading message for directory",
  },
  "ledgerEditor.manageSshKeys": {
    message: "SSHキーを管理",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "このディレクトリは空です",
    description: "Message shown when directory has no contents",
  },
};

export default jaDirectoryBrowse;
