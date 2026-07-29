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
  "ledgerEditor.loadingDirectoryContents": {
    message: "Cargando contenido del directorio...",
    description: "Loading message for directory",
  },
  "ledgerEditor.manageSshKeys": {
    message: "Administrar Claves SSH",
    description: "Menu item for SSH key management",
  },
  "ledgerEditor.thisDirectoryIsEmpty": {
    message: "Este directorio está vacío",
    description: "Message shown when directory has no contents",
  },
};

export default esDirectoryBrowse;
