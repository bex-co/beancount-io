const esDirectoryBrowse: Record<
  string,
  { message: string; description: string }
> = {
  "ledgerEditor.cloneRepository": {
    message: "Clonar Repositorio",
    description: "Header for clone repository dialog",
  },
  "ledgerEditor.downloadZip": {
    message: "Descargar ZIP",
    description: "Menu item to download as ZIP",
  },
  "ledgerEditor.downloadZipFailed": {
    message: "No se pudo preparar la descarga. Inténtalo de nuevo.",
    description: "Error shown when preparing the ZIP download fails",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Administrar Claves SSH",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Este directorio está vacío",
    description: "Message shown when directory has no contents",
  },
  "ledgerEditor.copyHttpCloneUrl": {
    message: "Copiar URL de clonación HTTP",
    description: "Accessible name for copying the HTTP clone URL",
  },
  "ledgerEditor.copySshCloneUrl": {
    message: "Copiar URL de clonación SSH",
    description: "Accessible name for copying the SSH clone URL",
  },
};

export default esDirectoryBrowse;
