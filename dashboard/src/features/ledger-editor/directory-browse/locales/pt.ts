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
  "ledgerEditor.downloadZipFailed": {
    message: "Não foi possível preparar o download. Tente novamente.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Gerenciar Chaves SSH",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Este diretório está vazio",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "Copiar URL de clone HTTP",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Copiar URL de clone SSH",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default ptDirectoryBrowse;
