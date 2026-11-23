const koDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "저장소 복제",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "ZIP 다운로드",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.downloadZipBlocked": {
    message: "브라우저가 다운로드를 차단했습니다. 아래 링크로 시작하세요.",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "다운로드를 준비할 수 없습니다. 다시 시도해 주세요.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "SSH 키 관리",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.folderNotFound": {
    message: "폴더를 찾을 수 없음: {path}",
    description:
      "Shown when a ledger folder path does not exist (contains {path})",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "이 디렉터리는 비어 있습니다",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "HTTP 클론 URL 복사",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.httpsBeaHint": {
    message:
      "bea 명령줄을 쓰면 {command}을(를) 한 번 실행하는 것으로 Git이 대신 로그인합니다. 쓰지 않는다면:",
    description:
      "Above the username and password hint under the HTTPS clone URL, on a self-hosted server only: the bea CLI command that makes Git sign in by itself. {command} is the literal command `bea cloud git setup`",
  },
  "ledgerEditor.httpsCredentialHint": {
    message:
      "사용자 이름: 아무거나. 비밀번호: 계정 비밀번호가 아닌 개인 액세스 토큰.",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "개인 액세스 토큰 만들기",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "SSH 클론 URL 복사",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default koDirectoryBrowse;
