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
  "ledgerEditor.loadingDirectoryContents": {
    message: "디렉터리 내용 불러오는 중...",
    description: "Loading message for directory",
  },
  "ledgerEditor.manageSshKeys": {
    message: "SSH 키 관리",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "이 디렉터리는 비어 있습니다",
    description: "Message shown when directory has no contents",
  },
};

export default koDirectoryBrowse;
