const ruDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "Клонировать репозиторий",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "Скачать ZIP",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Управление SSH-ключами",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Этот каталог пуст",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "Скопировать HTTP URL клонирования",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Скопировать SSH URL клонирования",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default ruDirectoryBrowse;
