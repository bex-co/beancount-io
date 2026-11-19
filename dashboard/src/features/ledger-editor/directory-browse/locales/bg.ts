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
  "ledgerEditor.downloadZipBlocked": {
    message:
      "Браузърът ви блокира изтеглянето. Използвайте връзката по-долу, за да го стартирате.",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "Изтеглянето не можа да бъде подготвено. Опитайте отново.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Управление на SSH ключове",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Тази директория е празна",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "Копирай HTTP URL за клониране",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.httpsBeaHint": {
    message:
      "С командния ред bea изпълнете {command} веднъж и Git ще влиза вместо вас. Без него:",
    description:
      "Above the username and password hint under the HTTPS clone URL, on a self-hosted server only: the bea CLI command that makes Git sign in by itself. {command} is the literal command `bea cloud git setup`",
  },
  "ledgerEditor.httpsCredentialHint": {
    message:
      "Потребителско име: произволно. Парола: личен токен за достъп, а не паролата на акаунта ви.",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "Създаване на личен токен за достъп",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Копирай SSH URL за клониране",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default bgDirectoryBrowse;
