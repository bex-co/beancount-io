const ukDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "Клонувати репозиторій",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "Завантажити ZIP",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.downloadZipBlocked": {
    message:
      "Браузер заблокував завантаження. Скористайтеся посиланням нижче, щоб почати.",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
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
  "ledgerEditor.httpsCredentialHint": {
    message:
      "Ім'я користувача: будь-яке. Пароль: персональний токен доступу, а не пароль облікового запису.",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "Створити персональний токен доступу",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Скопіювати SSH URL клонування",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default ukDirectoryBrowse;
