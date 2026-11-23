const ptDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "Clonar Repositório",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "Baixar ZIP",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.downloadZipBlocked": {
    message:
      "Seu navegador bloqueou o download. Use o link abaixo para iniciá-lo.",
    description:
      "Shown when the browser blocks the automatic ZIP download popup",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "Não foi possível preparar o download. Tente novamente.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Gerenciar Chaves SSH",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.folderNotFound": {
    message: "Pasta não encontrada: {path}",
    description:
      "Shown when a ledger folder path does not exist (contains {path})",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Este diretório está vazio",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "Copiar URL de clone HTTP",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.httpsBeaHint": {
    message:
      "Com a linha de comando bea, execute {command} uma vez e o Git entra por você. Sem ela:",
    description:
      "Above the username and password hint under the HTTPS clone URL, on a self-hosted server only: the bea CLI command that makes Git sign in by itself. {command} is the literal command `bea cloud git setup`",
  },
  "ledgerEditor.httpsCredentialHint": {
    message:
      "Usuário: qualquer um. Senha: um token de acesso pessoal, não a senha da sua conta.",
    description:
      "Under the HTTPS clone URL: what to type when git asks for a username and password",
  },
  "ledgerEditor.createAccessToken": {
    message: "Criar um token de acesso pessoal",
    description:
      "Link from the HTTPS clone option to the personal access token settings page",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Copiar URL de clone SSH",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default ptDirectoryBrowse;
