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
  "ledgerEditor.manageSshKeys": {
    message: "SSHキーを管理",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "このディレクトリは空です",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "HTTPクローンURLをコピー",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "SSHクローンURLをコピー",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default jaDirectoryBrowse;
