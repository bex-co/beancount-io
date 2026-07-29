const bgDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "Клониране на хранилище",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "Изтегляне като ZIP",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.loadingDirectoryContents": {
    message: "Зареждане на съдържанието на директорията...",
    description: "Loading message for directory",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Управление на SSH ключове",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Тази директория е празна",
    description: "Message shown when directory has no contents",
  },
};

export default bgDirectoryBrowse;
