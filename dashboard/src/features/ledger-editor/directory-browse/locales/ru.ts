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
  "ledgerEditor.downloadZipBlocked": {
    message:
      "Браузер заблокировал загрузку. Используйте ссылку ниже, чтобы начать её.",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "Не удалось подготовить загрузку. Попробуйте снова.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Управление SSH-ключами",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.folderNotFound": {
    message: "Папка не найдена: {path}",
    description:
      "Shown when a ledger folder path does not exist (contains {path})",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Этот каталог пуст",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "Скопировать HTTP URL клонирования",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.httpsBeaHint": {
    message:
      "С командной строкой bea выполните {command} один раз, и Git будет входить за вас. Без неё:",
    description:
      "Above the username and password hint under the HTTPS clone URL, on a self-hosted server only: the bea CLI command that makes Git sign in by itself. {command} is the literal command `bea cloud git setup`",
  },
  "ledgerEditor.httpsCredentialHint": {
    message:
      "Имя пользователя: любое. Пароль: персональный токен доступа, а не пароль от аккаунта.",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "Создать персональный токен доступа",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Скопировать SSH URL клонирования",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default ruDirectoryBrowse;
