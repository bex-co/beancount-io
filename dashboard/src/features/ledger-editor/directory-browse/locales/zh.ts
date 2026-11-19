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
  "ledgerEditor.downloadZipBlocked": {
    message: "浏览器阻止了此次下载。请使用下方链接开始下载。",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "无法准备下载，请重试。",
    description: "Error shown when preparing the ZIP download fails",
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
  "ledgerEditor.httpsBeaHint": {
    message:
      "使用 bea 命令行时，运行一次 {command}，Git 就会自动登录。不使用时：",
    description:
      "Above the username and password hint under the HTTPS clone URL, on a self-hosted server only: the bea CLI command that makes Git sign in by itself. {command} is the literal command `bea cloud git setup`",
  },
  "ledgerEditor.httpsCredentialHint": {
    message: "用户名：任意。密码：个人访问令牌，而不是账户密码。",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "创建个人访问令牌",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "复制 SSH 克隆地址",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default zhDirectoryBrowse;
