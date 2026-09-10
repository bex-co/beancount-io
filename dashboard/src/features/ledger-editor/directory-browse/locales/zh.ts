const zhDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "克隆仓库",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "下载 ZIP",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.manageSshKeys": {
    message: "管理 SSH 密钥",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "此目录为空",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "复制 HTTP 克隆地址",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "复制 SSH 克隆地址",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default zhDirectoryBrowse;
