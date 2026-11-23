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
  "ledgerEditor.downloadZipBlocked": {
    message:
      "ブラウザがダウンロードをブロックしました。下のリンクから開始してください。",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "ダウンロードを準備できませんでした。もう一度お試しください。",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "SSHキーを管理",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.folderNotFound": {
    message: "フォルダーが見つかりません: {path}",
    description:
      "Shown when a ledger folder path does not exist (contains {path})",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "このディレクトリは空です",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "HTTPクローンURLをコピー",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.httpsBeaHint": {
    message:
      "bea コマンドラインをお使いなら、{command} を一度実行すれば Git が自動でサインインします。使わない場合：",
    description:
      "Above the username and password hint under the HTTPS clone URL, on a self-hosted server only: the bea CLI command that makes Git sign in by itself. {command} is the literal command `bea cloud git setup`",
  },
  "ledgerEditor.httpsCredentialHint": {
    message:
      "ユーザー名：任意。パスワード：アカウントのパスワードではなく、個人アクセストークン。",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "個人アクセストークンを作成",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "SSHクローンURLをコピー",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default jaDirectoryBrowse;
