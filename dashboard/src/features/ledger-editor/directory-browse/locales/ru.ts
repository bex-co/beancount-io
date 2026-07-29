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
  "ledgerEditor.loadingDirectoryContents": {
    message: "Загрузка содержимого каталога...",
    description: "Loading message for directory",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Управление SSH-ключами",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Этот каталог пуст",
    description: "Message shown when directory has no contents",
  },
};

export default ruDirectoryBrowse;
