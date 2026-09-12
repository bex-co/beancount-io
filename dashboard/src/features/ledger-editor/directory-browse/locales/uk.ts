const ukDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "Клонувати репозиторій",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "Вownload ZIP",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "Не вдалося підготувати завантаження. Спробуйте ще раз.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Керування SSH ключами",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Ця директорія порожня",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "Скопіювати HTTP URL клонування",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Скопіювати SSH URL клонування",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default ukDirectoryBrowse;
